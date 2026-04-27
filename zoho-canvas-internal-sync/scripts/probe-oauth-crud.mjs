// 公式 OAuth Bearer で Canvas CRUD が通るか確認する。
// 使い捨て Canvas を作成 → 確認 → リネーム → 削除。痕跡を残さない。

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
  if (!j.access_token) throw new Error(`token failed: ${JSON.stringify(j)}`);
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
console.log('token: OK\n');

// (0) 全モジュール取得 → Home id を抽出
let mr = await call('GET', '/crm/v8/settings/modules', token);
console.log(`[GET modules]  ${mr.status}`);
const homeMod = (mr.json?.modules || []).find(m => m.api_name === 'Home' || m.module_name === 'Home');
const HOME_MOD_ID = homeMod?.id;
console.log(`HOME_MOD_ID = ${HOME_MOD_ID}  (api_name=${homeMod?.api_name}, module_name=${homeMod?.module_name})\n`);
if (!HOME_MOD_ID) {
  console.log('Home module not found — fallback to first 5 modules:');
  for (const m of (mr.json?.modules || []).slice(0, 5)) console.log(`  ${m.id}  ${m.api_name}  ${m.module_name}`);
  process.exit(1);
}

// (1) GET 一覧（事前）
let r = await call('GET', '/crm/v8/settings/canvas/views?feature=HomeView', token);
console.log(`[GET list before]  ${r.status}  ${r.text.slice(0, 200)}\n`);

// (2) POST 作成
const createPayload = {
  canvas_view: [{
    name: 'oauth_probe_delete_me',
    ui: {
      value: { style: {}, custom_style: {}, position: { start_x: 0, start_y: 0, end_x: 5040, width: 1680, height: 832, depth: 1 } },
      canvas_rules: [],
      script_info: { mapping: {}, deleted: [] },
    },
    feature: 'HomeView',
    module: { id: HOME_MOD_ID, api_name: 'Home' },
    children: [
      {
        type: 'component', theme: 'Custom Layout',
        ui: { value: {
          style: { default: { _section_version_: 1 } },
          custom_style: {},
          position: { start_x: 26, start_y: 42, end_x: 1579, width: 1553, height: 102, depth: 1 },
          class: 'zc-lsection',
          zcode: { name: 'section1' },
        }},
        children: [],
      },
    ],
    action: 'create',
    related_to: { data_hub_associations: null, lookup_associations: null, homepage_associations: [] },
  }],
};
r = await call('POST', '/crm/v8/settings/canvas/views', token, createPayload);
console.log(`[POST create]  ${r.status}  ${r.text.slice(0, 300)}\n`);
const createdId = r.json?.canvas_view?.[0]?.details?.id;
if (!createdId) {
  console.log('POST failed — abort');
  process.exit(1);
}

// (3) GET 詳細
r = await call('GET', `/crm/v8/settings/canvas/views/${createdId}?parsed=false`, token);
console.log(`[GET detail]   ${r.status}  len=${r.text.length}\n`);

// (4) PUT 更新（リネーム）
const updatePayload = JSON.parse(JSON.stringify(createPayload));
updatePayload.canvas_view[0].name = 'oauth_probe_renamed';
updatePayload.canvas_view[0].action = 'edit';
r = await call('PUT', `/crm/v8/settings/canvas/views/${createdId}`, token, updatePayload);
console.log(`[PUT update]   ${r.status}  ${r.text.slice(0, 300)}\n`);

// (5) GET 一覧で名前確認
r = await call('GET', '/crm/v8/settings/canvas/views?feature=HomeView', token);
const after = r.json?.canvas_view?.find(v => v.id === createdId);
console.log(`[GET list after] ${r.status}  found_name=${after?.name}\n`);

// (6) DELETE
r = await call('DELETE', `/crm/v8/settings/canvas/views/${createdId}`, token);
console.log(`[DELETE]       ${r.status}  ${r.text.slice(0, 300)}\n`);

// (7) GET 削除後
r = await call('GET', `/crm/v8/settings/canvas/views/${createdId}?parsed=false`, token);
console.log(`[GET after del] ${r.status}  ${r.text.slice(0, 200)}\n`);
