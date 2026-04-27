// 公式OAuth Bearer (Client Credentials Flow) の最小クライアント。
// scope = ZohoCRM.settings.ALL があれば Canvas CRUD すべて通る。

const DC = (process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp').toLowerCase();
const TLD_MAP = { jp: 'jp', us: 'com', eu: 'eu', in: 'in', au: 'com.au', ca: 'zohocloud.ca' };
const TLD = TLD_MAP[DC] || 'jp';

export const ZOHO = {
  TLD,
  ACCOUNTS: `https://accounts.zoho.${TLD}`,
  API: `https://www.zohoapis.${TLD}`,
};

const tokenCache = new Map();

export async function getToken({ orgId, scope = 'ZohoCRM.settings.ALL', clientId, clientSecret } = {}) {
  orgId = orgId || process.env.ZOHO_ORG_ID;
  clientId = clientId || process.env.ZOHO_CLIENT_ID;
  clientSecret = clientSecret || process.env.ZOHO_CLIENT_SECRET;
  if (!orgId || !clientId || !clientSecret) throw new Error('missing ZOHO_ORG_ID / ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET');
  const key = `${orgId}|${scope}|${clientId}`;
  const c = tokenCache.get(key);
  if (c && c.exp > Date.now() + 30_000) return c.token;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope,
    soid: `ZohoCRM.${orgId}`,
  });
  const r = await fetch(`${ZOHO.ACCOUNTS}/oauth/v2/token`, { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) throw new Error(`oauth: ${JSON.stringify(j)}`);
  tokenCache.set(key, { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 });
  return j.access_token;
}

export async function call(method, path, { token, body, host = ZOHO.API } = {}) {
  const opts = {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
  };
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await fetch(`${host}${path}`, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, text, json };
}

export async function getModules(token) {
  const r = await call('GET', '/crm/v8/settings/modules', { token });
  return r.json?.modules || [];
}

export async function getLayouts(token, moduleApiName) {
  const r = await call('GET', `/crm/v8/settings/layouts?module=${encodeURIComponent(moduleApiName)}`, { token });
  return r.json?.layouts || [];
}

export const canvas = {
  list: (token, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return call('GET', `/crm/v8/settings/canvas/views${q ? '?' + q : ''}`, { token });
  },
  get: (token, id, parsed = false) =>
    call('GET', `/crm/v8/settings/canvas/views/${id}${parsed ? '' : '?parsed=false'}`, { token }),
  create: (token, payload) =>
    call('POST', '/crm/v8/settings/canvas/views', { token, body: payload }),
  update: (token, id, payload) =>
    call('PUT', `/crm/v8/settings/canvas/views/${id}`, { token, body: payload }),
  delete: (token, id) =>
    call('DELETE', `/crm/v8/settings/canvas/views/${id}`, { token }),
};
