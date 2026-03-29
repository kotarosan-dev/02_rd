// 05_import-csv.js
// 既存Analyticsテーブルへ CSV インポート
const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const ANA_ORG_ID = '90000792715';
const WS_ID = '102896000000028001';
const DEALS_VIEW_ID = '102896000000029002';
const LEADS_VIEW_ID = '102896000000028006';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ANALYTICS_PIPELINE_CSV = `Deal_Name,Stage,Amount,Lead_Source,Type,Closing_Month,Probability
フューチャーテック CRM導入,条件確認,1200000,Web Site,New Business,2026-06,30
グリーンソリューション DX支援,提案,3500000,Seminar,New Business,2026-05,50
ネクストロジスティクス 基幹連携,見積もりの提示,8000000,Internal Seminar,New Business,2026-07,60
ひかりクリニック 電子化,ニーズの分析,2400000,Partner,New Business,2026-06,40
スマートリテール EC連携,意思決定,5500000,Trade Show,New Business,2026-08,45
ブルースカイ学園 管理DX,ニーズの分析,1800000,Web Site,New Business,2026-05,55
テックスタートアップ CRM,受注,600000,Web Site,New Business,2026-03,100
ハーベスト不動産 顧客管理,交渉,4200000,Web Site,Existing Business,2026-04,75`;

const ANALYTICS_LEADS_CSV = `Full_Name,Company,Industry,Lead_Source,Lead_Status,No_of_Employees,Annual_Revenue
田中 太郎,株式会社フューチャーテック,Technology,Web Site,Contacted,150,300000000
鈴木 花子,合同会社サクラメディア,Media,Advertisement,Not Contacted,45,80000000
佐藤 健一,株式会社グリーンソリューション,Consulting,Seminar,Qualified,30,120000000
山田 次郎,医療法人ひかりクリニック,Healthcare,Partner,Contacted,80,250000000
伊藤 美咲,株式会社ハーベスト不動産,Real Estate,Web Site,Not Contacted,200,800000000
渡辺 翔,有限会社ウェーブデザイン,Design,Cold Call,Unqualified,12,40000000
中村 恵,株式会社ネクストロジスティクス,Transportation,Internal Seminar,Qualified,500,2000000000
小林 誠,学校法人ブルースカイ学園,Education,Web Site,Contacted,180,600000000
加藤 由美,株式会社スマートリテール,Retail,Trade Show,Contacted,350,1500000000
吉田 浩二,合同会社テックスタートアップ,Technology,Web Site,Qualified,20,60000000`;

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
  if (d.error) throw new Error(`Token error: ${d.error}`);
  return d.access_token;
}

async function importCsv(token, viewId, tableName, csvData) {
  const FormData = require('form-data');
  const config = {
    importType: 'truncateadd',
    fileType: 'csv',
    autoIdentify: 'true',
    onError: 'setcolumnempty',
  };

  const form = new FormData();
  form.append('DATA', csvData);

  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': ANA_ORG_ID,
      ...form.getHeaders(),
    },
    body: form,
  });
  const d = await r.json();
  if (d.status === 'success') {
    console.log(`✅ CSV import [${tableName}] 完了 rows:${d.data?.importSummary?.successRowCount}`);
    return true;
  }
  console.log(`⚠️  CSV import失敗 [${tableName}]:`, JSON.stringify(d).slice(0, 300));
  return false;
}

async function main() {
  console.log('=== CSV インポート開始 ===');
  const token = await getToken();
  console.log('✅ Token取得完了');

  await importCsv(token, DEALS_VIEW_ID, 'CRM_Deals_Pipeline', ANALYTICS_PIPELINE_CSV);
  await sleep(2000);
  await importCsv(token, LEADS_VIEW_ID, 'CRM_Leads_Overview', ANALYTICS_LEADS_CSV);

  const result = {
    wsId: WS_ID,
    dealsViewId: DEALS_VIEW_ID,
    leadsViewId: LEADS_VIEW_ID,
    orgId: ANA_ORG_ID,
    url: `https://analytics.zoho.${DC}/workspace/${WS_ID}`,
  };
  require('fs').writeFileSync('./analytics-result.json', JSON.stringify(result, null, 2));

  console.log('\n=== 完了 ===');
  console.log('WorkspaceID:', WS_ID);
  console.log(`Analytics URL: https://analytics.zoho.${DC}/workspace/${WS_ID}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
