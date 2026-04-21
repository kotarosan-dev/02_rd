// 共通ライブラリ: Zoho Books OAuth + 安全な fetch
// .env は node --env-file で読み込む前提

for (const v of ['DEBUG', 'NODE_DEBUG']) {
  if (process.env[v]) delete process.env[v];
}

const DC = process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp';
const TLD_MAP = { jp: 'jp', us: 'com', eu: 'eu', in: 'in', au: 'com.au', ca: 'zohocloud.ca' };
export const TLD = TLD_MAP[DC] || 'jp';
export const ACCOUNTS_URL = `https://accounts.zoho.${TLD}`;
export const BOOKS_BASE = `https://www.zohoapis.${TLD}/books/v3`;
export const DC_CODE = DC;

const _tokenCache = new Map();

export async function getBooksToken(orgIdForSoid, scope = 'ZohoBooks.fullaccess.all') {
  const key = `${orgIdForSoid}|${scope}`;
  const cached = _tokenCache.get(key);
  if (cached && cached.exp > Date.now()) return cached.token;

  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope,
    soid: `ZohoBooks.${orgIdForSoid}`,
  });
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, { method: 'POST', body: params });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Books token failed (soid=ZohoBooks.${orgIdForSoid}): ${JSON.stringify(data)}`);
  }
  _tokenCache.set(key, { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 });
  return data.access_token;
}

export async function booksGet(path, { token, orgId, query = {} }) {
  const u = new URL(`${BOOKS_BASE}${path}`);
  if (orgId) u.searchParams.set('organization_id', orgId);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, raw: text.slice(0, 500) };
}

export async function booksPost(path, body, { token, orgId, query = {} }) {
  const u = new URL(`${BOOKS_BASE}${path}`);
  if (orgId) u.searchParams.set('organization_id', orgId);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  const res = await fetch(u, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, raw: text.slice(0, 500) };
}

export async function booksDelete(path, { token, orgId }) {
  const u = new URL(`${BOOKS_BASE}${path}`);
  if (orgId) u.searchParams.set('organization_id', orgId);
  const res = await fetch(u, {
    method: 'DELETE',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, raw: text.slice(0, 500) };
}

export function fmtSummary(label, { status, json }) {
  const code = json?.code;
  const msg = json?.message;
  const head = `${label.padEnd(50)} HTTP=${status} code=${code ?? '-'} msg=${(msg ?? '').slice(0, 60)}`;
  return head;
}
