import 'dotenv/config';

const required = ['ZOHO_CRM_COOKIE', 'ZOHO_CRM_CSRF', 'ZOHO_CRM_ORG_ID'];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`[FATAL] ${k} is not set. Copy .env.example to .env and fill it.`);
    process.exit(1);
  }
}

export const BASE = process.env.ZOHO_CRM_BASE || 'https://crm.zoho.jp';
const COOKIE = process.env.ZOHO_CRM_COOKIE;
const CSRF = process.env.ZOHO_CRM_CSRF;
const ORG = process.env.ZOHO_CRM_ORG_ID;

function headers(extra = {}) {
  return {
    'Accept': '*/*',
    'Accept-Language': 'ja',
    'Cookie': COOKIE,
    'Origin': BASE,
    'Referer': `${BASE}/`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'X-CRM-ORG': ORG,
    'X-Requested-With': 'XMLHttpRequest',
    'X-ZCSRF-TOKEN': `crmcsrfparam=${CSRF}`,
    ...extra,
  };
}

async function request(method, path, body) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: headers(body ? { 'Content-Type': 'text/plain;charset=UTF-8' } : {}),
  };
  if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { status: res.status, text, json };
}

export const api = {
  /** GET 一覧。feature: HomeView | ListView | DetailView 等 */
  listViews: (feature) => request('GET', `/crm/v8/settings/canvas/views?feature=${encodeURIComponent(feature)}`),

  /** GET 詳細。?parsed=false で完全な定義（GUIで開いた時の内部状態） */
  getView: (id) => request('GET', `/crm/v8/settings/canvas/views/${id}?parsed=false`),

  /** POST 新規作成。payload は { canvas_view: [{ name, ui, feature, module, children, action: 'create', related_to }] } */
  createView: (payload) => request('POST', `/crm/v8/settings/canvas/views`, payload),

  /** PUT 更新。POSTと同じ shape + action: 'edit' を送る（GET ?parsed=false の生レスポンスをそのまま送ると効かない） */
  updateView: (id, payload) => request('PUT', `/crm/v8/settings/canvas/views/${id}`, payload),

  /** DELETE 削除 */
  deleteView: (id) => request('DELETE', `/crm/v8/settings/canvas/views/${id}`),
};
