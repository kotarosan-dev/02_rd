// Books 内部 API 用 fetch ラッパー
// ⚠️ 自社 Org (kotarosan) 専用。クライアント Org・他人 Cookie での使用禁止。
// ⚠️ skill 化・汎用配布禁止。詳細は docs/books-internal-api-spec.md 冒頭を参照。
// 必要環境変数 (.env.books):
//   ZOHO_BOOKS_BASE_URL=https://books.zoho.jp
//   ZOHO_BOOKS_ORG_ID=90000792806
//   ZOHO_BOOKS_CSRF_TOKEN=zbcsparam=...
//   ZOHO_BOOKS_COOKIE=...; ...
//   ZOHO_BOOKS_SOURCE=zbclient        (任意)
//   ZOHO_BOOKS_ROLE_ID=3092...        (任意)
//   ZOHO_BOOKS_ASSET_VERSION=Apr_18_2026_23910 (任意)

import { zohoFetch, setDefaultOpts } from './_zoho_fetch.mjs';

// 既定: 429/5xx で指数バックオフ + ±20% ジッター。レート残量があればログ。
// Books 内部 API のエラーコードは整数 (12, 5, ...) で OAuth REST と異なるため、
// NON_RETRYABLE 判定は各呼び出し元で必要に応じて opts で上書きする。
setDefaultOpts({
  nonRetryableCodes: new Set(),
  onRetry: ({ attempt, status, delay, url }) => {
    console.warn(`[books-retry #${attempt}] status=${status} delay=${delay}ms url=${url.slice(0, 80)}...`);
  },
  tokenRefresher: () => {
    throw new Error(
      'Books Cookie/CSRF が失効しました。docs/har-capture-procedure-books.md に従い再採取して .env.books を更新してください。'
    );
  },
});

const need = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`環境変数 ${k} が未設定です（.env.books を確認）`);
  return v;
};

export const BASE = process.env.ZOHO_BOOKS_BASE_URL || 'https://books.zoho.jp';
export const ORG_ID = need('ZOHO_BOOKS_ORG_ID');

function commonHeaders() {
  const h = {
    'Cookie': need('ZOHO_BOOKS_COOKIE'),
    'X-ZCSRF-TOKEN': need('ZOHO_BOOKS_CSRF_TOKEN'),
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': BASE,
    'Referer': `${BASE}/app/${ORG_ID}`,
    'X-ZB-SOURCE': process.env.ZOHO_BOOKS_SOURCE || 'zbclient',
    'X-ZOHO-Include-Formatted': 'true',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'ja',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
  if (process.env.ZOHO_BOOKS_ROLE_ID) h['X-ROLE-ID'] = process.env.ZOHO_BOOKS_ROLE_ID;
  if (process.env.ZOHO_BOOKS_ASSET_VERSION) h['X-ZB-Asset-Version'] = process.env.ZOHO_BOOKS_ASSET_VERSION;
  return h;
}

function withOrg(p) {
  const sep = p.includes('?') ? '&' : '?';
  return `${BASE}${p}${sep}organization_id=${ORG_ID}`;
}

export async function bGet(p) {
  const url = withOrg(p);
  const res = await zohoFetch(url, { headers: commonHeaders() });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url };
}

export async function bPost(p, jsonObj) {
  // HAR 観察: organization_id は body 側にだけ載せる（URL と body 両方に書くと code 12）
  const url = `${BASE}${p}`;
  const body = `JSONString=${encodeURIComponent(JSON.stringify(jsonObj))}&organization_id=${ORG_ID}`;
  const res = await zohoFetch(url, {
    method: 'POST',
    headers: { ...commonHeaders(), 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text };
}

export async function bPut(p, jsonObj) {
  const url = `${BASE}${p}`;
  const body = `JSONString=${encodeURIComponent(JSON.stringify(jsonObj))}&organization_id=${ORG_ID}`;
  const res = await zohoFetch(url, {
    method: 'PUT',
    headers: { ...commonHeaders(), 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url };
}

export async function bDelete(p) {
  const url = withOrg(p);
  const res = await zohoFetch(url, { method: 'DELETE', headers: commonHeaders() });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text };
}

function tryJson(t) { try { return JSON.parse(t); } catch { return null; } }
