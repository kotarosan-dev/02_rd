// Resilient fetch wrapper for Zoho APIs (OAuth REST と内部 API 両対応)
// 元ネタ: skill `zoho-crm-api-resilience` §4
// ⚠️ このハーネスは自社 Org 専用。汎用配布禁止（_books_lib.mjs と同様）。
//
// 使い方:
//   import { zohoFetch, setDefaultOpts } from './_zoho_fetch.mjs';
//   setDefaultOpts({ onRateInfo: (i) => console.warn('[rate]', i) });
//   const res = await zohoFetch(url, init); // 通常の fetch と同じ戻り値
//
// 401 復旧:
//   tokenRefresher は次のいずれかを返す:
//     - string  → OAuth: `Authorization: Zoho-oauthtoken {token}` を差し替え
//     - object  → 内部 API: { headers: { Cookie, 'X-ZCSRF-TOKEN', ... } } を init.headers にマージ

import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_NON_RETRYABLE = new Set([
  'INVALID_DATA', 'MANDATORY_NOT_FOUND', 'OAUTH_SCOPE_MISMATCH',
  'NO_PERMISSION', 'INSUFFICIENT_PERMISSION', 'DUPLICATE_DATA',
  'PAYLOAD_TOO_LARGE',
]);

let DEFAULTS = {
  maxRetries: 5,
  baseDelayMs: 1000,
  nonRetryableCodes: DEFAULT_NON_RETRYABLE,
  tokenRefresher: null,
  onRateInfo: null,
  onRetry: null,
};

export function setDefaultOpts(o) {
  DEFAULTS = { ...DEFAULTS, ...o };
}

function classifyCode(json) {
  // OAuth REST: { code: "INVALID_DATA", ... } or { data: [{ code: "INVALID_DATA", ... }] }
  // 内部 API (Books): { code: 12, message: "..." } のような整数コード
  if (!json) return null;
  if (typeof json.code === 'string') return json.code;
  if (Array.isArray(json.data) && typeof json.data[0]?.code === 'string') return json.data[0].code;
  return null;
}

export async function zohoFetch(url, init = {}, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  let attempt = 0;
  let didRefresh = false;

  while (true) {
    const res = await fetch(url, init);

    if (cfg.onRateInfo) {
      const info = {
        limit:     res.headers.get('x-ratelimit-limit'),
        remaining: res.headers.get('x-ratelimit-remaining'),
        reset:     res.headers.get('x-ratelimit-reset'),
        status:    res.status,
        url,
      };
      if (info.limit || info.remaining) cfg.onRateInfo(info);
    }

    if (res.ok || res.status === 204) return res;

    // 401: Cookie/CSRF or OAuth トークン期限切れ → 1 回だけ再取得して再試行
    if (res.status === 401 && cfg.tokenRefresher && !didRefresh) {
      const refreshed = await cfg.tokenRefresher(res);
      if (typeof refreshed === 'string') {
        init.headers = { ...(init.headers || {}), Authorization: `Zoho-oauthtoken ${refreshed}` };
      } else if (refreshed && typeof refreshed === 'object') {
        init.headers = { ...(init.headers || {}), ...(refreshed.headers || refreshed) };
      }
      didRefresh = true;
      continue;
    }

    // 4xx (429 以外): code を見て非リトライ判定
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      const text = await res.clone().text();
      const json = tryJson(text);
      const code = classifyCode(json);
      if (cfg.nonRetryableCodes.has(code) || res.status !== 401) {
        // 401 で tokenRefresher 未指定 or 既に再試行済 → そのまま fail（呼び出し側で処理）
        return res;
      }
    }

    // 429 / 5xx: バックオフ
    if (attempt >= cfg.maxRetries) {
      return res;
    }
    const retryAfterSec = Number(res.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfterSec) && retryAfterSec > 0
      ? retryAfterSec * 1000
      : Math.round(cfg.baseDelayMs * (2 ** attempt) * (0.8 + Math.random() * 0.4));

    if (cfg.onRetry) cfg.onRetry({ attempt: attempt + 1, status: res.status, delay, url });
    await sleep(delay);
    attempt++;
  }
}

function tryJson(t) { try { return JSON.parse(t); } catch { return null; } }
