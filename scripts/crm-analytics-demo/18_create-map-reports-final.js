// 18_create-map-reports-final.js
// operation="geo" で正しいマップレポートを作成
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const ANA_ORG_ID = '90000792715';
const WS_ID = '102896000000028001';
const H = { 'ZANALYTICS-ORGID': ANA_ORG_ID };
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
  return (await r.json()).access_token;
}

async function createReport(token, config, label) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json();
  const viewId = d.data?.viewId;
  console.log(`  [${label}] ${d.status} viewId=${viewId || 'N/A'} ${d.data?.errorMessage || ''}`);
  if (viewId) {
    console.log(`  → https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${viewId}`);
  }
  return viewId;
}

const REPORTS = [
  {
    label: '世界地図: 国別売上バブル',
    config: {
      baseTableName: 'GEO_Test_Countries',
      title: '世界地図: 国別売上バブルマップ',
      description: 'operation=geo で作成した地図チャート',
      reportType: 'chart',
      chartType: 'map bubble',
      axisColumns: [
        { type: 'xAxis', columnName: 'Country', operation: 'geo' },
        { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
      ],
    },
  },
  {
    label: '日本地図: 都道府県別パイプライン（漢字・コロプレス）',
    config: {
      baseTableName: 'GEO_Test_JP_Kanji',
      title: '日本地図: 都道府県別売上コロプレス',
      description: '漢字都道府県名 + Country列 + operation=geo',
      reportType: 'chart',
      chartType: 'map area',
      axisColumns: [
        { type: 'xAxis', columnName: 'Prefecture', operation: 'geo' },
        { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
      ],
    },
  },
  {
    label: '日本地図: 都道府県別バブル（漢字）',
    config: {
      baseTableName: 'GEO_Test_JP_Kanji',
      title: '日本地図: 都道府県別案件バブル',
      description: '漢字都道府県名 + operation=geo + map bubble',
      reportType: 'chart',
      chartType: 'map bubble',
      axisColumns: [
        { type: 'xAxis', columnName: 'Prefecture', operation: 'geo' },
        { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
      ],
    },
  },
  {
    label: '都道府県別パイプライン（メインテーブル・コロプレス）',
    config: {
      baseTableName: 'CRM_Sales_by_Prefecture_v2',
      title: '都道府県別パイプライン金額マップ',
      description: 'メインテーブルからの地図チャート',
      reportType: 'chart',
      chartType: 'map area',
      axisColumns: [
        { type: 'xAxis', columnName: 'Prefecture', operation: 'geo' },
        { type: 'yAxis', columnName: 'Total_Amount', operation: 'sum' },
      ],
    },
  },
];

async function main() {
  const token = await getToken();
  console.log('✅ Token OK\n');

  const results = [];
  for (const rpt of REPORTS) {
    console.log(`--- ${rpt.label} ---`);
    const viewId = await createReport(token, rpt.config, rpt.label);
    results.push({ label: rpt.label, viewId, url: viewId ? `https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${viewId}` : null });
    await sleep(2000);
    console.log('');
  }

  console.log('=== 結果まとめ ===');
  results.forEach(r => {
    console.log(`${r.viewId ? '✅' : '❌'} ${r.label}`);
    if (r.url) console.log(`   ${r.url}`);
  });

  fs.writeFileSync('./map-final-result.json', JSON.stringify({
    created: new Date().toISOString(),
    key: 'operation: "geo" enables map charts via API',
    results,
  }, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
