// 15_test-geo-operation.js
// X軸の operation を "actual" 以外の値で試して、地図チャートが有効になるか検証
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
  const text = await r.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 300) }; }
  const viewId = parsed.data?.viewId;
  console.log(`  [${label}] status=${r.status} viewId=${viewId || 'N/A'} ${parsed.status || ''} ${parsed.data?.errorMessage || ''}`);
  return viewId;
}

async function updateReport(token, reportId, config, label) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports/${reportId}`, {
    method: 'PUT',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await r.text();
  console.log(`  [${label}] PUT status=${r.status} body="${text.slice(0, 300)}"`);
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
    return buf.length;
  }
  console.log(`  ⚠️ ${filename}: ${await r.text()}`);
  return 0;
}

// GEO operation の候補値
const GEO_OPERATIONS = [
  'geo',
  'geoLocation',
  'geographic',
  'location',
  'dimension',
  'measure',
];

async function main() {
  const token = await getToken();
  console.log('✅ Token OK\n');

  const TABLE = 'GEO_Test_Countries';

  // Test 1: Create Report with various xAxis operations
  console.log('=== Test 1: Create Report with different xAxis operation values ===\n');
  for (const op of GEO_OPERATIONS) {
    const config = {
      baseTableName: TABLE,
      title: `GeoOp Test: ${op}`,
      reportType: 'chart',
      chartType: 'map bubble',
      axisColumns: [
        { type: 'xAxis', columnName: 'Country', operation: op },
        { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
      ],
    };
    const viewId = await createReport(token, config, `Create op="${op}"`);
    if (viewId) {
      await sleep(1500);
      const size = await exportImage(token, viewId, `geo_op_${op}.png`);
      console.log(`  → ${size > 25000 ? '🗺️ MIGHT BE MAP!' : '📊 Likely bar chart'} (${size} bytes)\n`);
    } else {
      console.log(`  → ❌ Failed\n`);
    }
    await sleep(2000);
  }

  // Test 2: Update existing report with different operations
  console.log('\n=== Test 2: Update existing report (pie→map) with geo operation ===\n');
  const BASE_REPORT = '102896000000030307'; // Test A (currently pie from previous test)
  for (const op of GEO_OPERATIONS) {
    const config = {
      reportType: 'chart',
      chartType: 'map bubble',
      axisColumns: [
        { type: 'xAxis', columnName: 'Country', operation: op },
        { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
      ],
    };
    const ok = await updateReport(token, BASE_REPORT, config, `Update op="${op}"`);
    if (ok) {
      await sleep(1500);
      const size = await exportImage(token, BASE_REPORT, `geo_update_${op}.png`);
      console.log(`  → ${size > 25000 ? '🗺️ MIGHT BE MAP!' : '📊 Likely bar/pie'} (${size} bytes)\n`);
    }
    await sleep(2000);
  }

  console.log('\nDone. Check geo_op_*.png and geo_update_*.png files.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
