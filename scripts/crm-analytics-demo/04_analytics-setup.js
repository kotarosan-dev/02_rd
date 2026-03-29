// 04_analytics-setup.js
// Analytics ワークスペース・テーブル作成・CSV インポート
const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
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
  console.log('✅ Analytics Token:', d.access_token.slice(0, 25) + '...');
  return d.access_token;
}

async function getAnalyticsOrgId(token) {
  const r = await fetch(`${ANA_API}/restapi/v2/orgs`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` }
  });
  const d = await r.json();
  if (d.status === 'success' && d.data?.orgs?.length > 0) {
    const id = d.data.orgs[0].orgId;
    console.log('✅ Analytics OrgID:', id);
    return id;
  }
  throw new Error('OrgID取得失敗: ' + JSON.stringify(d));
}

async function createWorkspace(token, orgId, name) {
  const body = new URLSearchParams();
  body.append('CONFIG', JSON.stringify({ workspaceName: name, workspaceDesc: 'CRM サンプルデモ用ワークスペース' }));
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': orgId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const d = await r.json();
  if (d.status === 'success' && d.data?.workspaceId) {
    console.log(`✅ Workspace [${name}] ID:${d.data.workspaceId}`);
    return d.data.workspaceId;
  }
  throw new Error('Workspace作成失敗: ' + JSON.stringify(d).slice(0, 300));
}

async function createTableAndImport(token, orgId, wsId, tableName, columns, csvData) {
  const tableBody = new URLSearchParams();
  tableBody.append('CONFIG', JSON.stringify({ tableDesign: { TABLENAME: tableName, COLUMNS: columns } }));
  const tRes = await fetch(`${ANA_API}/restapi/v2/workspaces/${wsId}/tables`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': orgId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tableBody.toString(),
  });
  const tData = await tRes.json();
  const viewId = tData.data?.viewId || tData.data?.views?.[0]?.viewId;
  if (!viewId) {
    console.log(`⚠️  Table作成失敗 [${tableName}]:`, JSON.stringify(tData).slice(0, 200));
    return null;
  }
  console.log(`✅ Table [${tableName}] viewId:${viewId}`);

  await sleep(1500);

  const iForm = new URLSearchParams();
  iForm.append('CONFIG', JSON.stringify({
    ZOHO_ACTION: 'IMPORT',
    ZOHO_IMPORT_TYPE: 'TRUNCATEADD',
    ZOHO_AUTO_IDENTIFY: 'true',
    ZOHO_ON_IMPORT_ERROR: 'SETCOLUMNEMPTY',
    ZOHO_CREATE_TABLE: 'false',
  }));
  iForm.append('FILE_TYPE', 'CSV');
  iForm.append('FILEDATA', csvData);
  const iRes = await fetch(`${ANA_API}/restapi/v2/workspaces/${wsId}/views/${viewId}/data`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': orgId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: iForm.toString(),
  });
  const iData = await iRes.json();
  if (iData.status === 'success') {
    console.log(`✅ CSV import [${tableName}] 完了`);
  } else {
    console.log(`⚠️  CSV import失敗 [${tableName}]:`, JSON.stringify(iData).slice(0, 200));
  }
  return viewId;
}

async function main() {
  console.log('=== Analytics セットアップ ===');
  const token = await getToken();
  const orgId = await getAnalyticsOrgId(token);

  await sleep(1000);

  const wsId = await createWorkspace(token, orgId, 'CRM_Sales_Dashboard_Demo');
  await sleep(2000);

  const dealsViewId = await createTableAndImport(
    token, orgId, wsId,
    'CRM_Deals_Pipeline',
    [
      { COLUMNNAME: 'Deal_Name', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Stage', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Amount', DATATYPE: 'NUMBER' },
      { COLUMNNAME: 'Lead_Source', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Type', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Closing_Month', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Probability', DATATYPE: 'NUMBER' },
    ],
    ANALYTICS_PIPELINE_CSV
  );
  await sleep(2000);

  const leadsViewId = await createTableAndImport(
    token, orgId, wsId,
    'CRM_Leads_Overview',
    [
      { COLUMNNAME: 'Full_Name', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Company', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Industry', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Lead_Source', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'Lead_Status', DATATYPE: 'PLAIN' },
      { COLUMNNAME: 'No_of_Employees', DATATYPE: 'NUMBER' },
      { COLUMNNAME: 'Annual_Revenue', DATATYPE: 'NUMBER' },
    ],
    ANALYTICS_LEADS_CSV
  );

  const result = { wsId, dealsViewId, leadsViewId, orgId };
  require('fs').writeFileSync('./analytics-result.json', JSON.stringify(result, null, 2));

  console.log('\n=== 完了 ===');
  console.log('WorkspaceID:', wsId);
  console.log('Deals ViewID:', dealsViewId);
  console.log('Leads ViewID:', leadsViewId);
  console.log(`URL: https://analytics.zoho.${DC}/workspace/${wsId}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
