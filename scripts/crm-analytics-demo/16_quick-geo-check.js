// 16_quick-geo-check.js
// operation="geo" で作成済みのレポート (102896000000030349) を画像エクスポート
// + 新規レポートを operation="geo" で作成して即エクスポート
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

async function exportImage(token, viewId, filename) {
  const config = { responseFormat: 'image', imageFormat: 'png', width: 800, height: 600 };
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  console.log(`  Exporting ${viewId}...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H }, signal: controller.signal });
    clearTimeout(timeout);
    const ct = r.headers.get('content-type');
    console.log(`  Status: ${r.status}, Content-Type: ${ct}`);
    if (ct && ct.includes('image')) {
      const buf = await r.buffer();
      fs.writeFileSync(path.join(__dirname, filename), buf);
      console.log(`  ✅ ${filename}: ${buf.length} bytes`);
      return buf.length;
    }
    const text = await r.text();
    console.log(`  ⚠️ Response: ${text.slice(0, 300)}`);
    return 0;
  } catch (e) {
    clearTimeout(timeout);
    console.log(`  ⚠️ Error: ${e.message}`);
    return -1;
  }
}

async function createAndExport(token, op, chartType, label) {
  console.log(`\n--- ${label}: operation="${op}", chartType="${chartType}" ---`);
  const config = {
    baseTableName: 'GEO_Test_Countries',
    title: `${label}`,
    reportType: 'chart',
    chartType: chartType,
    axisColumns: [
      { type: 'xAxis', columnName: 'Country', operation: op },
      { type: 'yAxis', columnName: 'Revenue', operation: 'sum' },
    ],
  };
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json();
  const viewId = d.data?.viewId;
  console.log(`  Create: ${d.status} viewId=${viewId || 'N/A'} ${d.data?.errorMessage || ''}`);
  if (!viewId) return;
  
  await new Promise(r => setTimeout(r, 3000));
  await exportImage(token, viewId, `result_${op}_${chartType.replace(/ /g, '_')}.png`);
}

async function main() {
  const token = await getToken();
  console.log('✅ Token OK');

  // 1. 既存の operation="geo" レポートをエクスポート
  console.log('\n--- Existing report (op=geo, viewId=102896000000030349) ---');
  await exportImage(token, '102896000000030349', 'result_existing_geo.png');

  // 2. operation="geo" + chartType="map bubble" で新規作成
  await createAndExport(token, 'geo', 'map bubble', 'GeoOp_mapBubble');

  // 3. operation="geo" + chartType="bar" で新規作成（geoオペレーションだけで地図になるか）
  await createAndExport(token, 'geo', 'bar', 'GeoOp_bar');

  console.log('\n=== Done ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
