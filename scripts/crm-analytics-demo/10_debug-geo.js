// 10_debug-geo.js
// 1. テーブルのカラムメタデータを確認（GEO型になっているか）
// 2. autoIdentify=false でインポートし直す
// 3. メタデータ再確認
// 4. レポート再作成
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const ANA_ORG_ID = '90000792715';
const WS_ID = '102896000000028001';
const TABLE_VIEW_ID = '102896000000029348'; // CRM_Sales_by_Prefecture_v2
const sleep = ms => new Promise(r => setTimeout(r, ms));

const HEADERS_BASE = { 'ZANALYTICS-ORGID': ANA_ORG_ID };

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
  if (d.error) throw new Error(`Token: ${d.error}`);
  return d.access_token;
}

async function getViewMeta(token, viewId) {
  const config = JSON.stringify({ withInvolvedMetaInfo: true });
  const url = `${ANA_API}/restapi/v2/views/${viewId}?CONFIG=${encodeURIComponent(config)}`;
  const r = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...HEADERS_BASE },
  });
  return r.json();
}

async function deleteView(token, viewId) {
  try {
    const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Zoho-oauthtoken ${token}`, ...HEADERS_BASE },
    });
    const t = await r.text();
    console.log(`  Delete ${viewId}: ${t.slice(0, 100)}`);
  } catch (e) { console.log(`  Delete ${viewId}: ${e.message}`); }
}

async function createTable(token) {
  const config = {
    tableDesign: {
      TABLENAME: 'CRM_Sales_by_Prefecture_GEO',
      TABLEDESCRIPTION: 'Prefecture sales with GEO column type',
      COLUMNS: [
        { COLUMNNAME: 'Prefecture', DATATYPE: 'GEO', GEOROLE: 2 },
        { COLUMNNAME: 'Region', DATATYPE: 'PLAIN' },
        { COLUMNNAME: 'Total_Amount', DATATYPE: 'NUMBER' },
        { COLUMNNAME: 'Deal_Count', DATATYPE: 'NUMBER' },
        { COLUMNNAME: 'Avg_Amount', DATATYPE: 'NUMBER' },
      ],
    },
  };
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/tables`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...HEADERS_BASE, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json();
  console.log('  Create table response:', JSON.stringify(d).slice(0, 300));
  return d.data?.viewId || null;
}

async function importCsv(token, viewId, autoId) {
  const csv = `Prefecture,Region,Total_Amount,Deal_Count,Avg_Amount
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

  const config = { importType: 'truncateadd', fileType: 'csv', autoIdentify: autoId, onError: 'setcolumnempty' };
  const form = new FormData();
  form.append('DATA', csv);
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...HEADERS_BASE, ...form.getHeaders() },
    body: form,
  });
  const d = await r.json();
  console.log(`  Import (autoIdentify=${autoId}):`, JSON.stringify(d).slice(0, 300));
  return d.status === 'success';
}

async function createReport(token, tableViewId, tableName, config, label) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...HEADERS_BASE, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json();
  console.log(`  [${label}]:`, JSON.stringify(d).slice(0, 300));
  return d.data?.viewId || null;
}

async function main() {
  const token = await getToken();
  console.log('✅ Token OK\n');

  // Step 1: 既存テーブルのメタデータを確認
  console.log('=== Step 1: 既存テーブル (CRM_Sales_by_Prefecture_v2) のメタデータ ===');
  const meta1 = await getViewMeta(token, TABLE_VIEW_ID);
  console.log(JSON.stringify(meta1, null, 2).slice(0, 2000));
  await sleep(2000);

  // Step 2: 新テーブルをGEO型で作成
  console.log('\n=== Step 2: 新テーブル作成 (GEO型) ===');
  const newViewId = await createTable(token);
  if (!newViewId) { console.error('テーブル作成失敗'); process.exit(1); }
  await sleep(2000);

  // Step 3: autoIdentify=false でインポート
  console.log('\n=== Step 3: CSV Import (autoIdentify=false) ===');
  await importCsv(token, newViewId, 'false');
  await sleep(2000);

  // Step 4: インポート後のメタデータ確認
  console.log('\n=== Step 4: インポート後のメタデータ確認 ===');
  const meta2 = await getViewMeta(token, newViewId);
  console.log(JSON.stringify(meta2, null, 2).slice(0, 2000));
  await sleep(2000);

  // Step 5: マップレポート作成
  console.log('\n=== Step 5: マップレポート作成 ===');
  const mapAreaId = await createReport(token, newViewId, 'CRM_Sales_by_Prefecture_GEO', {
    baseTableName: 'CRM_Sales_by_Prefecture_GEO',
    title: '地図: 都道府県別パイプライン金額（GEO修正版）',
    description: 'コロプレスマップ',
    reportType: 'chart',
    chartType: 'map area',
    axisColumns: [
      { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
      { type: 'yAxis', columnName: 'Total_Amount', operation: 'sum' },
    ],
  }, 'map area');
  await sleep(2000);

  const mapBubbleId = await createReport(token, newViewId, 'CRM_Sales_by_Prefecture_GEO', {
    baseTableName: 'CRM_Sales_by_Prefecture_GEO',
    title: '地図: 都道府県別案件数バブル（GEO修正版）',
    description: 'バブルマップ',
    reportType: 'chart',
    chartType: 'map bubble',
    axisColumns: [
      { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
      { type: 'yAxis', columnName: 'Deal_Count', operation: 'sum' },
    ],
  }, 'map bubble');

  // Step 6: レポートのメタデータ確認（chartType が正しく設定されているか）
  if (mapAreaId) {
    await sleep(2000);
    console.log('\n=== Step 6: map area レポートのメタデータ ===');
    const reportMeta = await getViewMeta(token, mapAreaId);
    console.log(JSON.stringify(reportMeta, null, 2).slice(0, 2000));
  }

  console.log('\n=== 結果 ===');
  console.log('テーブル:', newViewId);
  console.log('map area:', mapAreaId);
  console.log('map bubble:', mapBubbleId);
  if (mapAreaId) console.log(`URL: https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${mapAreaId}`);

  const fs = require('fs');
  fs.writeFileSync('./debug-geo-result.json', JSON.stringify({
    created: new Date().toISOString(),
    table: { viewId: newViewId, name: 'CRM_Sales_by_Prefecture_GEO' },
    maps: { area: mapAreaId, bubble: mapBubbleId },
    notes: 'autoIdentify=false, GEOROLE=2',
  }, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
