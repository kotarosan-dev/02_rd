// 公式OAuth Bearer 経由で、別OrgからpullしたCanvas JSONをID置換してクロスOrgデプロイする検証。
// デモOrg(内部API取得) → 本番Org(OAuth POST) のフルパイプライン。

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const DC = (process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp').toLowerCase();
const TLD_MAP = { jp: 'jp', us: 'com', eu: 'eu', in: 'in', au: 'com.au', ca: 'zohocloud.ca' };
const TLD = TLD_MAP[DC] || 'jp';
const ACCOUNTS_URL = `https://accounts.zoho.${TLD}`;
const API_HOST = `https://www.zohoapis.${TLD}`;
const ORG_ID = process.env.ZOHO_ORG_ID;

async function getToken(scope) {
  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope,
    soid: `ZohoCRM.${ORG_ID}`,
  });
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, { method: 'POST', body: params });
  const j = await res.json();
  if (!j.access_token) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function call(method, path, token, body) {
  const opts = {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_HOST}${path}`, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, text, json };
}

const token = await getToken('ZohoCRM.settings.ALL');
console.log(`OAuth token: OK  (target ORG=${ORG_ID})\n`);

// --- 本番Org の Leads module id を取得
let r = await call('GET', '/crm/v8/settings/modules', token);
const leadsMod = (r.json?.modules || []).find(m => m.api_name === 'Leads');
if (!leadsMod) { console.log('Leads module not found'); process.exit(1); }
console.log(`Leads module: ${leadsMod.id}`);

// --- 本番Org の Leads Standard レイアウト id を取得
r = await call('GET', '/crm/v8/settings/layouts?module=Leads', token);
const layouts = r.json?.layouts || [];
console.log(`Leads layouts: ${layouts.length} (${layouts.map(l=>`${l.name}=${l.id}`).join(', ')})`);
const stdLayout = layouts.find(l => l.name === 'Standard') || layouts[0];
if (!stdLayout) { console.log('No layout'); process.exit(1); }
console.log(`use layout: ${stdLayout.name}=${stdLayout.id}\n`);

// --- 元JSON（デモOrgからpull済み）を読み込み
const SRC = resolve(__dirname, '..', 'canvases/DetailView/Leads/12343000002851050__detail_template1__parsed_false.json');
let raw = await readFile(SRC, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const src = JSON.parse(raw);
const view = src.canvas_view[0];

// --- ID置換
const OLD_MODULE = view.module.id;
const OLD_LAYOUT = view.layout?.id;
console.log(`remap: module ${OLD_MODULE} → ${leadsMod.id}`);
console.log(`remap: layout ${OLD_LAYOUT} → ${stdLayout.id}\n`);
view.module = { id: leadsMod.id, api_name: 'Leads' };
view.layout = { id: stdLayout.id, name: stdLayout.name };

// --- メタ削除 + componentid 剥がし
const stripKeys = ['id', 'created_time', 'modified_time', 'created_by', 'modified_by', 'is_default', 'state', 'source', 'type', 'generated_type', 'share', 'profiles'];
for (const k of stripKeys) delete view[k];
view.name = `oauth_cross_org_clone_${Date.now()}`;
view.action = 'create';
view.related_to = view.related_to || { data_hub_associations: null, lookup_associations: null, homepage_associations: [] };
function stripCompId(n) {
  if (!n || typeof n !== 'object') return;
  delete n.componentid;
  if (Array.isArray(n.children)) for (const c of n.children) stripCompId(c);
}
for (const c of view.children) stripCompId(c);

// --- OAuth POST
console.log(`POST as "${view.name}" ...`);
r = await call('POST', '/crm/v8/settings/canvas/views', token, { canvas_view: [view] });
console.log(`POST status=${r.status}`);
console.log(r.text.slice(0, 600));

const newId = r.json?.canvas_view?.[0]?.details?.id;
if (!newId) { console.log('POST failed — abort'); process.exit(1); }
console.log(`\ncreated id=${newId}`);

// --- GET 確認
r = await call('GET', `/crm/v8/settings/canvas/views/${newId}?parsed=false`, token);
console.log(`GET status=${r.status}, len=${r.text.length}`);

// --- DELETE 後始末
r = await call('DELETE', `/crm/v8/settings/canvas/views/${newId}`, token);
console.log(`DELETE status=${r.status}  ${r.text.slice(0, 200)}`);
