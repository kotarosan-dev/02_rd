// Zoho Social 内部 API 用 fetch ラッパー
// ⚠️ 自社 Portal 専用。クライアント Portal や他人 Cookie での使用禁止。
// ⚠️ skill 化・汎用配布禁止。詳細は docs/social-internal-api-spec.md 冒頭を参照。
//
// 必要環境変数 (.env.social):
//   ZOHO_SOCIAL_BASE_URL=https://social.zoho.jp
//   ZOHO_SOCIAL_PORTAL_NAME=kotarosan2
//   ZOHO_SOCIAL_BRAND_ID=2272000000011021
//   ZOHO_SOCIAL_CHANNEL_ID_LINKEDIN_PERSONAL=...
//   ZOHO_SOCIAL_COOKIE=...
//   ZOHO_SOCIAL_CSRF=<cmcsr cookie の値>  ← cmcsrfparam 用
//
// 重要な仕様 (Books と異なる):
//   - 全エンドポイントは /social/{portalName}/{brandId}/.../*.do の形
//   - 書込は application/x-www-form-urlencoded
//   - CSRF は ヘッダではなく BODY に cmcsrfparam=<csrf> として埋め込む
//   - パラメータも BODY に form として乗せる (JSONString= ではない)

const need = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`環境変数 ${k} が未設定です（.env.social を確認）`);
  return v;
};
const opt = (k, d = '') => process.env[k] || d;

export const BASE = opt('ZOHO_SOCIAL_BASE_URL', 'https://social.zoho.jp');
export const PORTAL_NAME = need('ZOHO_SOCIAL_PORTAL_NAME');
export const PORTAL_ID = opt('ZOHO_SOCIAL_PORTAL_ID');
export const BRAND_ID = opt('ZOHO_SOCIAL_BRAND_ID');
export const CHANNEL_TYPE = opt('ZOHO_SOCIAL_CHANNEL_TYPE', 'LINKEDIN_PERSONAL');
export const CHANNEL_ID_LI_PERSONAL = opt('ZOHO_SOCIAL_CHANNEL_ID_LINKEDIN_PERSONAL');
export const CHANNEL_ID_LI_COMPANY = opt('ZOHO_SOCIAL_CHANNEL_ID_LINKEDIN_COMPANY');
export const CHANNEL_ID = CHANNEL_TYPE === 'LINKEDIN_COMPANY' ? CHANNEL_ID_LI_COMPANY : CHANNEL_ID_LI_PERSONAL;

const UA = opt(
  'ZOHO_SOCIAL_USER_AGENT',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
);

function commonHeaders(extra = {}) {
  return {
    'Cookie': need('ZOHO_SOCIAL_COOKIE'),
    'X-Requested-With': 'XMLHttpRequest',
    'X-Browser-Timezone': 'Asia/Tokyo',
    'Origin': BASE,
    'Referer': `${BASE}/social/${PORTAL_NAME}/${BRAND_ID || ''}/Home.do`,
    'User-Agent': UA,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'ja',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    ...extra,
  };
}

function pathFor(rel) {
  const brand = BRAND_ID || '';
  // rel が "/" 始まりなら絶対パス、そうでなければ /social/{portal}/{brand}/ プレフィックス付与
  if (rel.startsWith('/')) return `${BASE}${rel}`;
  return `${BASE}/social/${PORTAL_NAME}/${brand}/${rel}`;
}

// GET: クエリは params で渡す
export async function sGet(rel, params = {}) {
  const url = new URL(pathFor(rel));
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: commonHeaders() });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url: url.toString() };
}

// POST (form): action 等を form として送る。CSRF は自動で cmcsrfparam に追加。
// 例: sPostForm('null/null/onezohoaction.do', { action: 'getportals' })
export async function sPostForm(rel, formObj = {}) {
  const url = pathFor(rel);
  const csrf = need('ZOHO_SOCIAL_CSRF');
  const body = new URLSearchParams({ ...formObj, cmcsrfparam: csrf }).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: commonHeaders({ 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }),
    body,
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url };
}

// v2 API: JSON ボディ。CSRF はヘッダ X-ZCSRF-TOKEN: cmcsrfparam=<value> 形式。
// portal/brand_id もヘッダで渡す。
// 例: sV2PostJson('/social/v2/post/drafts', { post: {...} })
export async function sV2PostJson(absPath, jsonObj) {
  const url = `${BASE}${absPath}`;
  const csrf = need('ZOHO_SOCIAL_CSRF');
  const headers = {
    ...commonHeaders({ 'Content-Type': 'application/json' }),
    'X-ZCSRF-TOKEN': `cmcsrfparam=${csrf}`,
  };
  if (PORTAL_ID) headers['portal'] = PORTAL_ID;
  if (BRAND_ID) headers['brand_id'] = BRAND_ID;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(jsonObj) });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url };
}

export async function sV2Get(absPath, params = {}) {
  const url = new URL(`${BASE}${absPath}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const headers = { ...commonHeaders() };
  if (PORTAL_ID) headers['portal'] = PORTAL_ID;
  if (BRAND_ID) headers['brand_id'] = BRAND_ID;
  const res = await fetch(url, { headers });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url: url.toString() };
}

export async function sV2Delete(absPath, params = {}) {
  const url = new URL(`${BASE}${absPath}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const csrf = need('ZOHO_SOCIAL_CSRF');
  const headers = { ...commonHeaders(), 'X-ZCSRF-TOKEN': `cmcsrfparam=${csrf}` };
  if (PORTAL_ID) headers['portal'] = PORTAL_ID;
  if (BRAND_ID) headers['brand_id'] = BRAND_ID;
  const res = await fetch(url, { method: 'DELETE', headers });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url: url.toString() };
}

// network コード → v2 API での network 文字列
export const NETWORK_STR = {
  '1': 'facebook',
  '2': 'twitter',
  '5': 'instagram',
  '6': 'gmb',
  '8': 'pinterest',
  '10': 'linkedinprofile',  // 個人。会社ページは linkedincompany かも (要HAR検証)
  '11': 'youtube',
  '12': 'tiktok',
  '13': 'threads',
};

// multipart (メディアアップロード用)
export async function sPostMultipart(rel, fields = {}, files = []) {
  const url = pathFor(rel);
  const csrf = need('ZOHO_SOCIAL_CSRF');
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...fields, cmcsrfparam: csrf })) fd.append(k, v);
  for (const { name, blob, filename } of files) fd.append(name, blob, filename);
  const res = await fetch(url, { method: 'POST', headers: commonHeaders(), body: fd });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text, url };
}

function tryJson(t) { try { return JSON.parse(t); } catch { return null; } }
