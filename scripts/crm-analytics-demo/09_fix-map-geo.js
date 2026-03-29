// 09_fix-map-geo.js
// 都道府県カラムを GEO 型（GEOROLE=2: State/Province）で再作成し、マップレポートを再生成
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const ANA_ORG_ID = '90000792715';
const WS_ID = '102896000000028001';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getToken() {
  const p = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'ZohoAnalytics.fullaccess.all',
    soid: `ZohoAnalytics.${CRM_ORG_ID}`,
  });
  const r = await fetch(`https://accounts.zoho.${DC}/oauth/v2/token`, { method: 'POST', body: p });
  const d = await r.json();
  if (d.error) throw new Error(`Token error: ${d.error}`);
  return d.access_token;
}

async function deleteView(token, viewId) {
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'ZANALYTICS-ORGID': ANA_ORG_ID },
  });
  const d = await r.json();
  console.log(`  Delete ${viewId}: ${d.status}`);
  return d.status === 'success';
}

async function createTable(token, tableName, columns) {
  const config = { tableDesign: { TABLENAME: tableName, COLUMNS: columns } };
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/tables`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': ANA_ORG_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const d = await r.json();
  if (d.status === 'success') {
    const viewId = d.data?.viewId || d.data?.views?.[0]?.viewId;
    console.log(`  ✅ Table "${tableName}" viewId: ${viewId}`);
    return viewId;
  }
  console.log(`  ⚠️ Table Error:`, JSON.stringify(d).slice(0, 400));
  return null;
}

async function importCsv(token, viewId, tableName, csvData) {
  const config = { importType: 'truncateadd', fileType: 'csv', autoIdentify: 'true', onError: 'setcolumnempty' };
  const form = new FormData();
  form.append('DATA', csvData);
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'ZANALYTICS-ORGID': ANA_ORG_ID, ...form.getHeaders() },
    body: form,
  });
  const d = await r.json();
  if (d.status === 'success') {
    console.log(`  ✅ Import [${tableName}] rows: ${d.data?.importSummary?.successRowCount}`);
    return true;
  }
  console.log(`  ⚠️ Import Error:`, JSON.stringify(d).slice(0, 400));
  return false;
}

async function createReport(token, config, label) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': ANA_ORG_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const d = await r.json();
  if (d.status === 'success') {
    const viewId = d.data?.viewId;
    console.log(`  ✅ [${label}] viewId: ${viewId}`);
    console.log(`     → https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${viewId}`);
    return viewId;
  }
  console.log(`  ⚠️ [${label}] Error:`, JSON.stringify(d).slice(0, 400));
  return null;
}

const PREFECTURE_CSV = `Prefecture,Region,Total_Amount,Deal_Count,Avg_Amount
東京都,関東,12500000,8,1562500
大阪府,近畿,8400000,6,1400000
愛知県,中部,6200000,5,1240000
神奈川県,関東,5800000,4,1450000
福岡県,九州,4100000,3,1366667
北海道,北海道,3200000,3,1066667
宮城県,東北,2800000,2,1400000
広島県,中国,2400000,2,1200000
京都府,近畿,2100000,2,1050000
兵庫県,近畿,1900000,2,950000
静岡県,中部,1700000,2,850000
埼玉県,関東,1600000,2,800000
千葉県,関東,1400000,2,700000
新潟県,中部,1200000,1,1200000
岡山県,中国,900000,1,900000
熊本県,九州,800000,1,800000`;

async function main() {
  console.log('=== マップ修正: GEO型カラムで再作成 ===\n');
  const token = await getToken();
  console.log('✅ Token取得完了\n');

  console.log('--- Step 1: 旧テーブル・旧レポート削除（スキップ：既に削除済みの可能性） ---');

  // GEO 型カラムでテーブル再作成
  // DATATYPE: "GEO", GEOROLE: 2 (State/Province)
  console.log('\n--- Step 2: GEO 型でテーブル再作成 ---');
  const prefViewId = await createTable(token, 'CRM_Sales_by_Prefecture_v2', [
    { COLUMNNAME: 'Prefecture',   DATATYPE: 'GEO', GEOROLE: 2 },
    { COLUMNNAME: 'Region',       DATATYPE: 'PLAIN' },
    { COLUMNNAME: 'Total_Amount', DATATYPE: 'NUMBER' },
    { COLUMNNAME: 'Deal_Count',   DATATYPE: 'NUMBER' },
    { COLUMNNAME: 'Avg_Amount',   DATATYPE: 'NUMBER' },
  ]);
  if (!prefViewId) { console.error('テーブル作成失敗'); process.exit(1); }
  await sleep(2000);

  // CSVインポート
  console.log('\n--- Step 3: データインポート ---');
  await importCsv(token, prefViewId, 'CRM_Sales_by_Prefecture_v2', PREFECTURE_CSV);
  await sleep(2000);

  // マップレポート再作成
  console.log('\n--- Step 4: マップレポート再作成 ---');

  const mapAreaId = await createReport(token, {
    baseTableName: 'CRM_Sales_by_Prefecture_v2',
    title: '日本地図: 都道府県別パイプライン金額',
    description: 'コロプレスマップ。東京・大阪・愛知が上位3都府県',
    reportType: 'chart',
    chartType: 'map area',
    axisColumns: [
      { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
      { type: 'yAxis', columnName: 'Total_Amount', operation: 'sum' },
    ],
  }, 'map area（コロプレス）');
  await sleep(2000);

  const mapBubbleId = await createReport(token, {
    baseTableName: 'CRM_Sales_by_Prefecture_v2',
    title: '日本地図: 都道府県別案件数（バブル）',
    description: 'バブルマップ。東京・大阪がトップ2',
    reportType: 'chart',
    chartType: 'map bubble',
    axisColumns: [
      { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
      { type: 'yAxis', columnName: 'Deal_Count', operation: 'sum' },
    ],
  }, 'map bubble（バブル）');

  console.log('\n=== 完了 ===');
  console.log('コロプレスマップ:', mapAreaId ? `https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${mapAreaId}` : 'FAILED');
  console.log('バブルマップ:', mapBubbleId ? `https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${mapBubbleId}` : 'FAILED');
  console.log('\nダッシュボードの「編集」モードで新しいマップレポートをドラッグ配置してください');

  require('fs').writeFileSync('./map-fix-result.json', JSON.stringify({
    created: new Date().toISOString(),
    prefectureTable: { viewId: prefViewId, name: 'CRM_Sales_by_Prefecture_v2' },
    maps: { area: mapAreaId, bubble: mapBubbleId },
    fix: 'GEO型 GEOROLE:2 (State/Province) で再作成',
  }, null, 2));
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
