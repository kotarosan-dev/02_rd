// 17_geo-long-timeout.js
// operation="geo" + chartType="map bubble" のレポートを長いタイムアウトでエクスポート
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

async function exportImage(token, viewId, filename, timeoutMs) {
  const config = { responseFormat: 'image', imageFormat: 'png', width: 800, height: 600 };
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  console.log(`  Exporting ${viewId} (timeout: ${timeoutMs/1000}s)...`);
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H }, signal: controller.signal });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const ct = r.headers.get('content-type');
    console.log(`  Status: ${r.status}, Content-Type: ${ct}, Elapsed: ${elapsed}ms`);
    if (ct && ct.includes('image')) {
      const buf = await r.buffer();
      fs.writeFileSync(path.join(__dirname, filename), buf);
      console.log(`  ✅ ${filename}: ${buf.length} bytes`);
      return buf.length;
    }
    const text = await r.text();
    console.log(`  Response: ${text.slice(0, 500)}`);
    return 0;
  } catch (e) {
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    console.log(`  ⚠️ Error after ${elapsed}ms: ${e.message}`);
    return -1;
  }
}

async function main() {
  const token = await getToken();
  console.log('✅ Token OK\n');

  // op="geo" + chartType="map bubble" のレポート (102896000000028363)
  console.log('--- Test: op="geo" + chartType="map bubble" (120s timeout) ---');
  const size = await exportImage(token, '102896000000028363', 'map_geo_op_result.png', 120000);
  
  if (size > 0) {
    console.log(`\n📊 File size: ${size} bytes`);
    console.log(size > 25000 ? '🗺️ Likely a MAP chart!' : '📊 Likely a bar chart');
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
