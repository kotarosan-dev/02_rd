// 03_insert-deals-and-analytics.js
// トークンを1回取得して Deals 投入 → Analytics へデータ転送
const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC      = process.env.ZOHO_DATA_CENTER || 'jp';
const ORG_ID  = process.env.ZOHO_ORG_ID;
const ACCOUNTS= `https://accounts.zoho.${DC}`;
const API     = `https://www.zohoapis.${DC}`;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const sleep   = ms => new Promise(r => setTimeout(r, ms));

async function getToken(service, scope) {
  const p = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope,
    soid: `${service}.${ORG_ID}`,
  });
  const r = await fetch(`${ACCOUNTS}/oauth/v2/token`, { method: 'POST', body: p });
  const d = await r.json();
  if (d.error) throw new Error(`Token error [${service}]: ${d.error} - ${d.error_description}`);
  console.log(`✅ Token [${service}]:`, d.access_token.slice(0, 25) + '...');
  return d.access_token;
}

// --- DEALS サンプルデータ ---
// Stage値は日本語display_value（このCRM環境はJP設定のため）
// Pipeline は 'Standard (Standard)' が必須
const DEALS = [
  { Deal_Name: 'フューチャーテック CRM導入', Amount: 1200000, Stage: '条件確認', Pipeline: 'Standard (Standard)', Closing_Date: '2026-06-30', Lead_Source: 'Web Site', Type: 'New Business' },
  { Deal_Name: 'グリーンソリューション DX支援', Amount: 3500000, Stage: '提案', Pipeline: 'Standard (Standard)', Closing_Date: '2026-05-31', Lead_Source: 'Seminar', Type: 'New Business' },
  { Deal_Name: 'ネクストロジスティクス 基幹連携', Amount: 8000000, Stage: '見積もりの提示', Pipeline: 'Standard (Standard)', Closing_Date: '2026-07-31', Lead_Source: 'Internal Seminar', Type: 'New Business' },
  { Deal_Name: 'ひかりクリニック 電子化', Amount: 2400000, Stage: 'ニーズの分析', Pipeline: 'Standard (Standard)', Closing_Date: '2026-06-15', Lead_Source: 'Partner', Type: 'New Business' },
  { Deal_Name: 'スマートリテール EC連携', Amount: 5500000, Stage: '意思決定', Pipeline: 'Standard (Standard)', Closing_Date: '2026-08-31', Lead_Source: 'Trade Show', Type: 'New Business' },
  { Deal_Name: 'ブルースカイ学園 管理DX', Amount: 1800000, Stage: 'ニーズの分析', Pipeline: 'Standard (Standard)', Closing_Date: '2026-05-15', Lead_Source: 'Web Site', Type: 'New Business' },
  { Deal_Name: 'テックスタートアップ CRM', Amount: 600000, Stage: '受注', Pipeline: 'Standard (Standard)', Closing_Date: '2026-03-15', Lead_Source: 'Web Site', Type: 'New Business' },
  { Deal_Name: 'ハーベスト不動産 顧客管理', Amount: 4200000, Stage: '交渉', Pipeline: 'Standard (Standard)', Closing_Date: '2026-04-30', Lead_Source: 'Web Site', Type: 'Existing Business' },
];

// Deals の Analytics 用 CSV データ（ステージ別パイプライン分析）
const ANALYTICS_PIPELINE_CSV = `Deal_Name,Stage,Amount,Lead_Source,Type,Closing_Month,Probability
フューチャーテック CRM導入,Qualification,1200000,Web Site,New Business,2026-06,30
グリーンソリューション DX支援,Value Proposition,3500000,Seminar,New Business,2026-05,50
ネクストロジスティクス 基幹連携,Proposal/Price Quote,8000000,Internal Seminar,New Business,2026-07,60
ひかりクリニック 電子化,Needs Analysis,2400000,Partner,New Business,2026-06,40
スマートリテール EC連携,Id. Decision Makers,5500000,Trade Show,New Business,2026-08,45
ブルースカイ学園 管理DX,Perception Analysis,1800000,Web Site,New Business,2026-05,55
テックスタートアップ CRM,Closed Won,600000,Web Site,New Business,2026-03,100
ハーベスト不動産 顧客管理,Negotiation/Review,4200000,Web Site,Existing Business,2026-04,75`;

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

async function insertDeals(crmToken) {
  console.log('\n▶ Deals 投入中（Stage値確認しながら）...');
  const dealIds = [];

  for (let i = 0; i < DEALS.length; i++) {
    const deal = DEALS[i];
    const res = await fetch(`${API}/crm/v8/Deals`, {
      method: 'POST',
      headers: { Authorization: `Zoho-oauthtoken ${crmToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [deal], trigger: [] }),
    });
    const d = await res.json();
    if (d.data && d.data[0].status === 'success') {
      dealIds.push(d.data[0].details.id);
      console.log(`  ✅ [${i+1}] ${deal.Deal_Name} ¥${deal.Amount.toLocaleString()} Stage:${deal.Stage}`);
    } else {
      const errCode = d.data?.[0]?.code || d.code;
      const errMsg  = d.data?.[0]?.message || d.message;
      console.log(`  ⚠️  [${i+1}] ${deal.Deal_Name}: ${errCode} - ${errMsg}`);
      // Stage が合わない場合は Stage なしで再試行
      if (errCode === 'MAPPING_MISMATCH') {
        const deal2 = { ...deal };
        delete deal2.Stage;
        const res2 = await fetch(`${API}/crm/v8/Deals`, {
          method: 'POST',
          headers: { Authorization: `Zoho-oauthtoken ${crmToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: [deal2], trigger: [] }),
        });
        const d2 = await res2.json();
        if (d2.data && d2.data[0].status === 'success') {
          dealIds.push(d2.data[0].details.id);
          console.log(`     ↳ ✅ Stage省略で成功 ID:${d2.data[0].details.id}`);
        } else {
          console.log(`     ↳ ❌ Stage省略も失敗: ${JSON.stringify(d2.data?.[0] || d2).slice(0, 150)}`);
        }
      }
    }
    await sleep(600);
  }
  return dealIds;
}

async function createAnalyticsWorkspace(anaToken, anaOrgId, wsName) {
  const config = { workspaceName: wsName, workspaceDesc: 'CRM サンプルデータ分析 - ダッシュボードデモ用' };
  const body = new URLSearchParams();
  body.append('CONFIG', JSON.stringify(config));

  const res = await fetch(
    `${ANA_API}/restapi/v2/workspaces`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${anaToken}`,
        'ZANALYTICS-ORGID': anaOrgId,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );
  const d = await res.json();
  if (d.status === 'success' && d.data?.workspaceId) {
    console.log(`  ✅ Workspace作成: ${wsName} / ID:${d.data.workspaceId}`);
    return d.data.workspaceId;
  }
  console.log('  ⚠️  Workspace作成失敗:', JSON.stringify(d).slice(0, 300));
  return null;
}

async function importCsvToTable(anaToken, anaOrgId, wsId, tableName, csvData) {
  const config = {
    tableDesign: {
      TABLENAME: tableName,
      COLUMNS: tableName === 'CRM_Deals_Pipeline'
        ? [
            { COLUMNNAME: 'Deal_Name', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Stage', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Amount', DATATYPE: 'NUMBER' },
            { COLUMNNAME: 'Lead_Source', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Type', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Closing_Month', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Probability', DATATYPE: 'NUMBER' },
          ]
        : [
            { COLUMNNAME: 'Full_Name', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Company', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Industry', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Lead_Source', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'Lead_Status', DATATYPE: 'PLAIN' },
            { COLUMNNAME: 'No_of_Employees', DATATYPE: 'NUMBER' },
            { COLUMNNAME: 'Annual_Revenue', DATATYPE: 'NUMBER' },
          ],
    },
  };

  const tableBody = new URLSearchParams();
  tableBody.append('CONFIG', JSON.stringify(config));
  const createRes = await fetch(
    `${ANA_API}/restapi/v2/workspaces/${wsId}/tables`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${anaToken}`,
        'ZANALYTICS-ORGID': anaOrgId,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tableBody.toString(),
    }
  );
  const createData = await createRes.json();
  if (!createData.data?.views?.length) {
    console.log(`  ⚠️  テーブル作成失敗 [${tableName}]:`, JSON.stringify(createData).slice(0, 300));
    return null;
  }
  const viewId = createData.data.views[0].viewId;
  console.log(`  ✅ テーブル作成 [${tableName}] viewId:${viewId}`);

  // CSV インポート
  await sleep(1000);
  const importConfig = { ZOHO_ACTION: 'IMPORT', ZOHO_IMPORT_TYPE: 'TRUNCATEADD', ZOHO_AUTO_IDENTIFY: 'true', ZOHO_ON_IMPORT_ERROR: 'SETCOLUMNEMPTY', ZOHO_CREATE_TABLE: 'false' };
  const form = new (require('url').URLSearchParams)();
  form.append('CONFIG', JSON.stringify(importConfig));
  form.append('FILE_TYPE', 'CSV');
  form.append('FILEDATA', csvData);

  const importRes = await fetch(
    `${ANA_API}/restapi/v2/workspaces/${wsId}/views/${viewId}/data`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${anaToken}`,
        'ZANALYTICS-ORGID': anaOrgId,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    }
  );
  const importData = await importRes.json();
  if (importData.status === 'success') {
    console.log(`  ✅ CSVインポート完了 [${tableName}]`);
  } else {
    console.log(`  ⚠️  CSVインポート失敗 [${tableName}]:`, JSON.stringify(importData).slice(0, 300));
  }
  return viewId;
}

async function getAnalyticsOrgId(anaToken) {
  const r = await fetch(`${ANA_API}/restapi/v2/orgs`, {
    headers: { Authorization: `Zoho-oauthtoken ${anaToken}` }
  });
  const d = await r.json();
  if (d.status === 'success' && d.data?.orgs?.length > 0) {
    const orgId = d.data.orgs[0].orgId;
    console.log(`  ✅ Analytics OrgID: ${orgId}`);
    return orgId;
  }
  throw new Error('Analytics Org ID 取得失敗: ' + JSON.stringify(d).slice(0, 200));
}

async function main() {
  console.log('=== Step 1: トークン取得 ===');
  const crmToken = await getToken('ZohoCRM', 'ZohoCRM.modules.ALL');
  await sleep(1000);
  const anaToken = await getToken('ZohoAnalytics', 'ZohoAnalytics.fullaccess.all');

  const ANA_ORG_ID = await getAnalyticsOrgId(anaToken);

  console.log('\n=== Step 2: Deals 投入 ===');
  const dealIds = await insertDeals(crmToken);
  console.log(`\nDeals 投入結果: ${dealIds.length} 件`);

  console.log('\n=== Step 3: Analytics ワークスペース & テーブル作成 ===');
  const wsName = 'CRM_Sales_Dashboard_Demo';
  const wsId = await createAnalyticsWorkspace(anaToken, ANA_ORG_ID, wsName);

  if (wsId) {
    await sleep(2000);
    const dealsViewId = await importCsvToTable(anaToken, ANA_ORG_ID, wsId, 'CRM_Deals_Pipeline', ANALYTICS_PIPELINE_CSV);
    await sleep(2000);
    const leadsViewId = await importCsvToTable(anaToken, ANA_ORG_ID, wsId, 'CRM_Leads_Overview', ANALYTICS_LEADS_CSV);

    const result = { wsId, wsName, dealsViewId, leadsViewId, dealIds };
    require('fs').writeFileSync('./analytics-result.json', JSON.stringify(result, null, 2));
    console.log('\n✅ analytics-result.json に保存しました');
    console.log('WorkspaceID:', wsId);
    console.log('Deals ViewID:', dealsViewId);
    console.log('Leads ViewID:', leadsViewId);
  }

  console.log('\n🎉 完了！');
}

main().catch(e => { console.error('\n❌ ERROR:', e.message); process.exit(1); });
