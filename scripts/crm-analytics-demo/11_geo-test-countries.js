// 11_geo-test-countries.js
// 検証: 英語国名 + GEOROLE=1(Country) で地図レポートが作れるかテスト
// さらに日本語都道府県 + Country列追加パターンもテスト
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const ANA_ORG_ID = '90000792715';
const WS_ID = '102896000000028001';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = { 'ZANALYTICS-ORGID': ANA_ORG_ID };

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

async function createTable(token, name, columns) {
  const config = { tableDesign: { TABLENAME: name, COLUMNS: columns } };
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/tables`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json();
  console.log(`  Table "${name}":`, d.status, d.data?.viewId || JSON.stringify(d.data?.errorMessage || d).slice(0, 200));
  return d.data?.viewId || null;
}

async function importCsv(token, viewId, csv, autoId) {
  const config = {
    importType: 'truncateadd',
    fileType: 'csv',
    autoIdentify: String(autoId),
  };
  if (!autoId || autoId === 'false' || autoId === false) {
    config.delimiter = 0;  // COMMA
    config.quoted = 2;     // DOUBLE QUOTE
  }
  const form = new FormData();
  form.append('DATA', csv);
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, ...form.getHeaders() },
    body: form,
  });
  const d = await r.json();
  if (d.status === 'success') {
    console.log(`  Import OK: ${d.data?.importSummary?.successRowCount} rows`);
    console.log(`  Column details:`, JSON.stringify(d.data?.columnDetails));
    return true;
  }
  console.log(`  Import ERROR:`, JSON.stringify(d).slice(0, 500));
  return false;
}

async function createReport(token, config, label) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json();
  console.log(`  [${label}]:`, d.status, d.data?.viewId || JSON.stringify(d).slice(0, 300));
  return d.data?.viewId || null;
}

async function getViewMeta(token, viewId) {
  const config = JSON.stringify({ withInvolvedMetaInfo: true });
  const r = await fetch(`${ANA_API}/restapi/v2/views/${viewId}?CONFIG=${encodeURIComponent(config)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H },
  });
  return r.json();
}

async function main() {
  const token = await getToken();
  console.log('✅ Token OK\n');
  const results = {};

  // ============================================
  // Test A: 英語国名 (GEOROLE=1 Country)
  // ============================================
  console.log('========== Test A: 英語国名 + GEOROLE=1 (Country) ==========');
  const tblA = await createTable(token, 'GEO_Test_Countries', [
    { COLUMNNAME: 'Country', DATATYPE: 'GEO', GEOROLE: 1 },
    { COLUMNNAME: 'Revenue', DATATYPE: 'NUMBER' },
  ]);
  await sleep(2000);

  if (tblA) {
    const csvA = `Country,Revenue
Japan,12500000
United States,8400000
Germany,6200000
United Kingdom,5800000
France,4100000
Australia,3200000
Canada,2800000
Brazil,2400000`;
    await importCsv(token, tblA, csvA, 'true');
    await sleep(2000);

    const rptA = await createReport(token, {
      baseTableName: 'GEO_Test_Countries',
      title: 'Test A: World Map - Revenue by Country',
      reportType: 'chart',
      chartType: 'map bubble',
      axisColumns: [
        { type: 'xAxis', columnName: 'Country', operation: 'actual' },
        { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
      ],
    }, 'Test A map bubble');
    results.testA = { table: tblA, report: rptA };
    if (rptA) {
      console.log(`  URL: https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${rptA}`);
    }
  }
  await sleep(2000);

  // ============================================
  // Test B: 日本語都道府県 + Country列追加 + GEOROLE=2
  // ============================================
  console.log('\n========== Test B: 日本語都道府県 + Country列 + GEOROLE=2 ==========');
  const tblB = await createTable(token, 'GEO_Test_JP_Prefecture', [
    { COLUMNNAME: 'Country', DATATYPE: 'GEO', GEOROLE: 1 },
    { COLUMNNAME: 'Prefecture', DATATYPE: 'GEO', GEOROLE: 2 },
    { COLUMNNAME: 'Amount', DATATYPE: 'NUMBER' },
  ]);
  await sleep(2000);

  if (tblB) {
    const csvB = `Country,Prefecture,Amount
Japan,Tokyo,12500000
Japan,Osaka,8400000
Japan,Aichi,6200000
Japan,Kanagawa,5800000
Japan,Fukuoka,4100000
Japan,Hokkaido,3200000
Japan,Miyagi,2800000
Japan,Hiroshima,2400000
Japan,Kyoto,2100000
Japan,Hyogo,1900000`;
    await importCsv(token, tblB, csvB, 'true');
    await sleep(2000);

    const rptB = await createReport(token, {
      baseTableName: 'GEO_Test_JP_Prefecture',
      title: 'Test B: Japan Map - Amount by Prefecture (English)',
      reportType: 'chart',
      chartType: 'map area',
      axisColumns: [
        { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
        { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
      ],
    }, 'Test B map area');
    results.testB = { table: tblB, report: rptB };
    if (rptB) {
      console.log(`  URL: https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${rptB}`);
    }
  }
  await sleep(2000);

  // ============================================
  // Test C: 日本語都道府県名（漢字） + Country列
  // ============================================
  console.log('\n========== Test C: 日本語漢字都道府県 + Country列 ==========');
  const tblC = await createTable(token, 'GEO_Test_JP_Kanji', [
    { COLUMNNAME: 'Country', DATATYPE: 'GEO', GEOROLE: 1 },
    { COLUMNNAME: 'Prefecture', DATATYPE: 'GEO', GEOROLE: 2 },
    { COLUMNNAME: 'Amount', DATATYPE: 'NUMBER' },
  ]);
  await sleep(2000);

  if (tblC) {
    const csvC = `Country,Prefecture,Amount
Japan,東京都,12500000
Japan,大阪府,8400000
Japan,愛知県,6200000
Japan,神奈川県,5800000
Japan,福岡県,4100000
Japan,北海道,3200000
Japan,宮城県,2800000
Japan,広島県,2400000
Japan,京都府,2100000
Japan,兵庫県,1900000`;
    await importCsv(token, tblC, csvC, 'true');
    await sleep(2000);

    const rptC = await createReport(token, {
      baseTableName: 'GEO_Test_JP_Kanji',
      title: 'Test C: Japan Map - 都道府県別金額（漢字）',
      reportType: 'chart',
      chartType: 'map area',
      axisColumns: [
        { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
        { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
      ],
    }, 'Test C map area');
    results.testC = { table: tblC, report: rptC };
    if (rptC) {
      console.log(`  URL: https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${rptC}`);
    }
  }
  await sleep(2000);

  // ============================================
  // Test D: 既存GEOテーブルにインポートし直す (autoIdentify=false + delimiter)
  // ============================================
  console.log('\n========== Test D: 既存テーブルに autoIdentify=false でインポート ==========');
  const existingViewId = '102896000000028272'; // CRM_Sales_by_Prefecture_GEO
  const csvD = `Prefecture,Region,Total_Amount,Deal_Count,Avg_Amount
東京都,関東,12500000,8,1562500
大阪府,近畿,8400000,6,1400000
愛知県,中部,6200000,5,1240000
神奈川県,関東,5800000,4,1450000
福岡県,九州,4100000,3,1366667
北海道,北海道,3200000,3,1066667
宮城県,東北,2800000,2,1400000
広島県,中国,2400000,2,1200000
京都府,近畿,2100000,2,1050000
兵庫県,近畿,1900000,2,950000`;
  await importCsv(token, existingViewId, csvD, false);
  await sleep(2000);

  // メタデータ確認
  const metaD = await getViewMeta(token, existingViewId);
  const cols = metaD.data?.views?.columns;
  if (cols) {
    console.log('  Column types after import:');
    cols.forEach(c => console.log(`    ${c.columnName}: ${c.dataType} (${c.dataTypeName})`));
  }

  console.log('\n========== 結果まとめ ==========');
  console.log(JSON.stringify(results, null, 2));

  require('fs').writeFileSync('./geo-test-result.json', JSON.stringify({
    created: new Date().toISOString(),
    results,
    note: 'Check each URL in browser to verify if map renders correctly',
  }, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
