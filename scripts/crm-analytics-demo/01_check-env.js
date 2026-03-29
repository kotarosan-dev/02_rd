// 01_check-env.js - CRM / Analytics 認証確認
const fetch = require('node-fetch');
const { getAccessToken, API_DOMAIN, ANALYTICS_BASE } = require('./zoho-auth');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const ORG_ID = process.env.ZOHO_ORG_ID;

async function main() {
  console.log('=== 認証確認 ===');
  console.log('ORG_ID:', ORG_ID);

  // CRM トークン取得
  const crmToken = await getAccessToken('ZohoCRM', 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL');
  console.log('CRM Token OK:', crmToken.slice(0, 20) + '...');

  // CRM 組織情報取得
  const orgRes = await fetch(`${API_DOMAIN}/crm/v8/org`, {
    headers: { Authorization: `Zoho-oauthtoken ${crmToken}` }
  });
  const orgData = await orgRes.json();
  console.log('\n--- CRM 組織情報 ---');
  if (orgData.org && orgData.org[0]) {
    const o = orgData.org[0];
    console.log('組織名:', o.company_name);
    console.log('タイムゾーン:', o.time_zone);
    console.log('通貨:', o.currency_symbol);
  } else {
    console.log(JSON.stringify(orgData, null, 2));
  }

  // CRM Leads モジュール確認
  const leadsRes = await fetch(`${API_DOMAIN}/crm/v8/Leads?per_page=3`, {
    headers: { Authorization: `Zoho-oauthtoken ${crmToken}` }
  });
  const leadsData = await leadsRes.json();
  console.log('\n--- Leads (先頭3件) ---');
  if (leadsData.data) {
    leadsData.data.forEach(l => console.log(`  - ${l.Full_Name || l.Last_Name} / ${l.Company} / ${l.Lead_Status}`));
    console.log(`  合計: ${leadsData.info?.count || leadsData.data.length} 件表示`);
  } else {
    console.log('Leads なし / エラー:', JSON.stringify(leadsData).slice(0, 200));
  }

  // Deals モジュール確認
  const dealsRes = await fetch(`${API_DOMAIN}/crm/v8/Deals?per_page=3`, {
    headers: { Authorization: `Zoho-oauthtoken ${crmToken}` }
  });
  const dealsData = await dealsRes.json();
  console.log('\n--- Deals (先頭3件) ---');
  if (dealsData.data) {
    dealsData.data.forEach(d => console.log(`  - ${d.Deal_Name} / ¥${d.Amount} / ${d.Stage}`));
  } else {
    console.log('Deals なし / エラー:', JSON.stringify(dealsData).slice(0, 200));
  }

  // Analytics トークン取得
  console.log('\n=== Analytics 認証確認 ===');
  const analyticsToken = await getAccessToken('ZohoAnalytics', 'ZohoAnalytics.fullaccess.all');
  console.log('Analytics Token OK:', analyticsToken.slice(0, 20) + '...');

  // Analytics ワークスペース一覧
  const wsRes = await fetch(`${ANALYTICS_BASE}/restapi/v2/workspaces`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${analyticsToken}`,
      'ZANALYTICS-ORGID': ORG_ID,
    }
  });
  const wsData = await wsRes.json();
  console.log('\n--- Analytics ワークスペース一覧 ---');
  if (wsData.data && wsData.data.workspaces) {
    wsData.data.workspaces.forEach(ws => console.log(`  - [${ws.workspaceId}] ${ws.workspaceName}`));
  } else {
    console.log(JSON.stringify(wsData).slice(0, 400));
  }

  console.log('\n✅ 環境確認完了');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
