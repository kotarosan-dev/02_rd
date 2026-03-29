// 12_export-chart-image.js
// レポートを画像エクスポートして実際のチャートタイプを確認する
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
  const d = await r.json();
  if (d.error) throw new Error(`Token: ${d.error}`);
  return d.access_token;
}

async function exportChartImage(token, viewId, label) {
  const config = { responseFormat: 'image', imageFormat: 'png', width: 800, height: 600 };
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  const r = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...H },
  });

  const contentType = r.headers.get('content-type');
  console.log(`  [${label}] Status: ${r.status}, Content-Type: ${contentType}`);

  if (contentType && contentType.includes('image')) {
    const buffer = await r.buffer();
    const filename = `chart_${viewId}.png`;
    fs.writeFileSync(path.join(__dirname, filename), buffer);
    console.log(`  ✅ Saved: ${filename} (${buffer.length} bytes)`);
    return filename;
  } else {
    const text = await r.text();
    console.log(`  ⚠️ Response:`, text.slice(0, 500));
    return null;
  }
}

const REPORTS = [
  { id: '102896000000030307', label: 'Test A: Country map bubble' },
  { id: '102896000000030317', label: 'Test B: JP Prefecture (English) map area' },
  { id: '102896000000030325', label: 'Test C: JP Prefecture (Kanji) map area' },
  { id: '102896000000030289', label: 'Original: JP map area (v2 table)' },
  { id: '102896000000029423', label: 'Original: JP map bubble (v2 table)' },
  { id: '102896000000028347', label: 'GEO fix: map area' },
];

async function main() {
  const token = await getToken();
  console.log('✅ Token OK\n');

  for (const rpt of REPORTS) {
    console.log(`--- Exporting: ${rpt.label} ---`);
    await exportChartImage(token, rpt.id, rpt.label);
    console.log('');
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('Done. Check PNG files in the script directory.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
