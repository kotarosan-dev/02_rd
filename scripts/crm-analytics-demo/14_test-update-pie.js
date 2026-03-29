// 14_test-update-pie.js
// Update Report API が本当に機能するか、まず pie に変更して検証
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

async function updateReport(token, reportId, config) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports/${reportId}`, {
    method: 'PUT',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await r.text();
  console.log(`  PUT ${reportId}: status=${r.status} body="${text.slice(0, 200)}"`);
  return r.status === 204;
}

async function exportImage(token, viewId, filename) {
  const config = { responseFormat: 'image', imageFormat: 'png', width: 800, height: 600 };
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H } });
  const ct = r.headers.get('content-type');
  if (ct && ct.includes('image')) {
    const buf = await r.buffer();
    fs.writeFileSync(path.join(__dirname, filename), buf);
    console.log(`  ✅ ${filename}: ${buf.length} bytes`);
  } else {
    console.log(`  ⚠️ ${filename}: ${await r.text()}`);
  }
}

async function main() {
  const token = await getToken();
  const RPT = '102896000000030307'; // Test A: Country

  // Step 1: Export BEFORE (should be bar)
  console.log('=== Before update (bar) ===');
  await exportImage(token, RPT, 'before_update.png');
  await sleep(2000);

  // Step 2: Update to PIE
  console.log('\n=== Update to PIE ===');
  await updateReport(token, RPT, {
    reportType: 'chart',
    chartType: 'pie',
    axisColumns: [
      { type: 'xAxis', columnName: 'Country', operation: 'actual' },
      { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
    ],
  });
  await sleep(3000);

  // Step 3: Export AFTER (should be pie if API works)
  console.log('\n=== After update to PIE ===');
  await exportImage(token, RPT, 'after_pie.png');
  await sleep(2000);

  // Step 4: Update to MAP BUBBLE
  console.log('\n=== Update to MAP BUBBLE ===');
  await updateReport(token, RPT, {
    reportType: 'chart',
    chartType: 'map bubble',
    axisColumns: [
      { type: 'xAxis', columnName: 'Country', operation: 'actual' },
      { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
    ],
  });
  await sleep(3000);

  // Step 5: Export AFTER map
  console.log('\n=== After update to MAP BUBBLE ===');
  await exportImage(token, RPT, 'after_map_bubble.png');

  console.log('\n比較: before_update.png vs after_pie.png vs after_map_bubble.png');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
