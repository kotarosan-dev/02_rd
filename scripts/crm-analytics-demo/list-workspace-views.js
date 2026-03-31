/**
 * Zoho Analytics: 指定ワークスペースのビュー一覧（レポート・テーブル等）を API で取得する。
 * 用途: ダッシュボードのタブ設計にレポート名を割り当てるための一覧出力。
 *
 * 実行例（02_R&D ルートから）:
 *   npx @dotenvx/dotenvx run -- node scripts/crm-analytics-demo/list-workspace-views.js
 *   npx @dotenvx/dotenvx run -- node scripts/crm-analytics-demo/list-workspace-views.js 102896000000028001
 *
 * 参照: zoho-setup references/analytics/api-reference.md — GET /restapi/v2/workspaces/{id}/views
 */
const fetch = require('node-fetch');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (_) {}

const DC = process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}/restapi/v2`;

const WORKSPACE_ID = process.argv[2] || '102896000000028001';

async function getTokenFixed() {
  const p = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'ZohoAnalytics.fullaccess.all',
    soid: `ZohoAnalytics.${CRM_ORG_ID}`,
  });
  const TLD_MAP = { jp: 'jp', us: 'com', eu: 'eu', in: 'in', au: 'com.au', ca: 'zohocloud.ca' };
  const tld = TLD_MAP[DC] || 'jp';
  const r = await fetch(`https://accounts.zoho.${tld}/oauth/v2/token`, { method: 'POST', body: p });
  const d = await r.json();
  if (d.error) throw new Error(`Token: ${d.error} ${d.error_description || ''}`);
  return d.access_token;
}

async function getAnalyticsOrgId(token) {
  const override = process.env.ZOHO_ANALYTICS_ORG_ID;
  if (override) {
    console.log('Analytics OrgID (env ZOHO_ANALYTICS_ORG_ID):', override);
    return override;
  }
  const r = await fetch(`${ANA_API}/orgs`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const d = await r.json();
  if (d.status === 'success' && d.data?.orgs?.length > 0) {
    const id = String(d.data.orgs[0].orgId);
    console.log('Analytics OrgID (GET /orgs 先頭):', id);
    return id;
  }
  throw new Error('OrgID 取得失敗: ' + JSON.stringify(d).slice(0, 500));
}

async function listViews(token, orgId, wsId) {
  const url = `${ANA_API}/workspaces/${wsId}/views`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': orgId,
    },
  });
  const text = await r.text();
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error(`非JSON応答 HTTP ${r.status}: ${text.slice(0, 400)}`);
  }
  return { status: r.status, body: d };
}

function flattenViews(payload) {
  const data = payload.data;
  if (!data) return [];
  if (Array.isArray(data.views)) return data.views;
  if (Array.isArray(data)) return data;
  if (data.workspaceViews && Array.isArray(data.workspaceViews)) return data.workspaceViews;
  return [];
}

async function main() {
  if (!CRM_ORG_ID || !process.env.ZOHO_CLIENT_ID) {
    console.error('ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_ORG_ID が .env に必要です。');
    process.exit(1);
  }
  const token = await getTokenFixed();
  const orgId = await getAnalyticsOrgId(token);
  const { status, body } = await listViews(token, orgId, WORKSPACE_ID);

  if (body.status !== 'success' && status >= 400) {
    console.error('API エラー:', JSON.stringify(body, null, 2).slice(0, 2000));
    process.exit(1);
  }

  const views = flattenViews(body);
  if (views.length === 0) {
    console.log('ビュー0件、または想定外のレスポンス構造。生データ（先頭1500文字）:');
    console.log(JSON.stringify(body, null, 2).slice(0, 1500));
    process.exit(0);
  }

  const rows = views.map((v) => ({
    viewId: v.viewId || v.id || v.view_id,
    name: v.viewName || v.name || v.displayName || '(無名)',
    type: v.viewType || v.type || v.objectType || '',
    folder: v.folderName || v.folderId || '',
  }));

  rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ja'));

  console.log('\n--- ワークスペース', WORKSPACE_ID, 'ビュー一覧', rows.length, '件 ---\n');
  console.log('viewId\t\ttype\tname');
  for (const row of rows) {
    console.log([row.viewId, row.type, row.name].join('\t'));
  }

  console.log('\n--- タブ設計用（名前のみ、コピペ用）---\n');
  const byType = {};
  for (const row of rows) {
    const t = row.type || 'Other';
    if (!byType[t]) byType[t] = [];
    byType[t].push(row.name);
  }
  for (const [t, names] of Object.entries(byType).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`# ${t} (${names.length})`);
    names.forEach((n) => console.log(`- ${n}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
