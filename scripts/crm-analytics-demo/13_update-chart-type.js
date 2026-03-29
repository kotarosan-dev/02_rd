// 13_update-chart-type.js
// Update Report API (PUT) で chartType を "map area" / "map bubble" に変更する
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
  const d = await r.json();
  if (d.error) throw new Error(`Token: ${d.error}`);
  return d.access_token;
}

async function updateReport(token, reportId, config, label) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports/${reportId}`, {
    method: 'PUT',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await r.text();
  console.log(`  [${label}] ${reportId} (status ${r.status}):`);
  console.log(`    Response: ${text.slice(0, 500)}`);
  try {
    const d = JSON.parse(text);
    return d.status === 'success';
  } catch {
    return r.status >= 200 && r.status < 300;
  }
}

async function exportChartImage(token, viewId, label) {
  const config = { responseFormat: 'image', imageFormat: 'png', width: 800, height: 600 };
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H } });
  const ct = r.headers.get('content-type');
  if (ct && ct.includes('image')) {
    const buffer = await r.buffer();
    const filename = `map_${viewId}.png`;
    fs.writeFileSync(path.join(__dirname, filename), buffer);
    console.log(`  ✅ [${label}] Saved: ${filename} (${buffer.length} bytes)`);
    return filename;
  }
  const text = await r.text();
  console.log(`  ⚠️ [${label}]:`, text.slice(0, 300));
  return null;
}

const UPDATES = [
  {
    reportId: '102896000000030307',
    label: 'Test A: Country → map bubble',
    config: {
      reportType: 'chart',
      chartType: 'map bubble',
      axisColumns: [
        { type: 'xAxis', columnName: 'Country', operation: 'actual' },
        { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
      ],
    },
  },
  {
    reportId: '102896000000030317',
    label: 'Test B: JP Prefecture (EN) → map area',
    config: {
      reportType: 'chart',
      chartType: 'map area',
      axisColumns: [
        { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
        { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
      ],
    },
  },
  {
    reportId: '102896000000030325',
    label: 'Test C: JP Prefecture (漢字) → map area',
    config: {
      reportType: 'chart',
      chartType: 'map area',
      axisColumns: [
        { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
        { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
      ],
    },
  },
];

async function main() {
  const token = await getToken();
  console.log('✅ Token OK\n');

  // Step 1: Update chartType
  console.log('=== Step 1: Update Report (PUT) で chartType 変更 ===');
  for (const u of UPDATES) {
    await updateReport(token, u.reportId, u.config, u.label);
    await sleep(2000);
  }

  // Step 2: Export images to verify
  console.log('\n=== Step 2: 画像エクスポートで検証 ===');
  for (const u of UPDATES) {
    await exportChartImage(token, u.reportId, u.label);
    await sleep(2000);
  }

  console.log('\n=== 完了 ===');
  console.log('map_*.png ファイルを確認してください');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
