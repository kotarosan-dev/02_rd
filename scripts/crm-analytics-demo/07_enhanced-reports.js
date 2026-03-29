// 07_enhanced-reports.js
// Layer 2: KPI集計クエリテーブル + Layer 3: 書籍知見ベースの改善レポート
const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const ANA_ORG_ID = '90000792715';
const WS_ID = '102896000000028001';
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
  if (d.error) throw new Error(`Token error: ${d.error}`);
  return d.access_token;
}

// --- Layer 2: クエリテーブル作成 ---

async function createQueryTable(token, name, sql) {
  const config = { queryTableName: name, sqlQuery: sql };
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });

  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/querytables`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': ANA_ORG_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const d = await r.json();
  if (d.status === 'success') {
    const viewId = d.data?.viewId || d.data?.views?.[0]?.viewId;
    console.log(`  ✅ QueryTable "${name}" viewId: ${viewId}`);
    return viewId;
  }
  console.log(`  ⚠️ QueryTable "${name}" Error:`, JSON.stringify(d).slice(0, 400));
  return null;
}

// --- Layer 3: レポート作成 ---

async function createReport(token, config) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'ZANALYTICS-ORGID': ANA_ORG_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const d = await r.json();
  if (d.status === 'success') {
    console.log(`  ✅ Report viewId: ${d.data?.viewId}`);
    return d.data?.viewId;
  }
  console.log(`  ⚠️ Report Error:`, JSON.stringify(d).slice(0, 400));
  return null;
}

// --- Layer 2 定義: クエリテーブル群 ---

const QUERY_TABLES = [
  {
    name: 'KPI_Summary',
    description: 'パイプライン全体のKPIサマリー',
    sql: `SELECT
  COUNT("CRM_Deals_Pipeline"."Deal_Name") AS "deal_count",
  SUM("CRM_Deals_Pipeline"."Amount") AS "total_pipeline",
  AVG("CRM_Deals_Pipeline"."Amount") AS "avg_deal_size",
  SUM(CASE WHEN "CRM_Deals_Pipeline"."Stage" = '受注' THEN "CRM_Deals_Pipeline"."Amount" ELSE 0 END) AS "won_amount",
  MAX("CRM_Deals_Pipeline"."Amount") AS "max_deal"
FROM "CRM_Deals_Pipeline"`,
  },
  {
    name: 'Stage_Conversion',
    description: 'ステージ別の件数と金額集計（ファネル・棒グラフ用）',
    sql: `SELECT
  "CRM_Deals_Pipeline"."Stage" AS "Stage",
  COUNT("CRM_Deals_Pipeline"."Deal_Name") AS "deal_count",
  SUM("CRM_Deals_Pipeline"."Amount") AS "total_amount",
  AVG("CRM_Deals_Pipeline"."Amount") AS "avg_amount"
FROM "CRM_Deals_Pipeline"
GROUP BY "CRM_Deals_Pipeline"."Stage"`,
  },
  {
    name: 'Source_Analysis',
    description: 'リードソース別の件数と金額（チャネル効果測定用）',
    sql: `SELECT
  "CRM_Deals_Pipeline"."Lead_Source" AS "Lead_Source",
  COUNT("CRM_Deals_Pipeline"."Deal_Name") AS "deal_count",
  SUM("CRM_Deals_Pipeline"."Amount") AS "total_amount",
  AVG("CRM_Deals_Pipeline"."Probability") AS "avg_probability"
FROM "CRM_Deals_Pipeline"
GROUP BY "CRM_Deals_Pipeline"."Lead_Source"`,
  },
  {
    name: 'Lead_Quality',
    description: 'リードソース×ステータスの品質分析',
    sql: `SELECT
  "CRM_Leads_Overview"."Lead_Source" AS "Lead_Source",
  "CRM_Leads_Overview"."Lead_Status" AS "Lead_Status",
  COUNT("CRM_Leads_Overview"."Full_Name") AS "lead_count"
FROM "CRM_Leads_Overview"
GROUP BY "CRM_Leads_Overview"."Lead_Source", "CRM_Leads_Overview"."Lead_Status"`,
  },
];

// --- Layer 3 定義: 改善レポート群 ---
// 書籍知見に基づくレポート。タイトルはデータ確認後に主張型に調整可能

const REPORTS = [
  // KPIサマリー（ダッシュボード最上段に配置）
  {
    baseTableName: 'KPI_Summary',
    title: 'KPIサマリー：パイプライン全体の健全性',
    description: '総パイプライン金額・案件数・平均単価・受注金額を一目で把握',
    reportType: 'summary',
    axisColumns: [
      { type: 'summarize', columnName: 'total_pipeline', operation: 'sum' },
      { type: 'summarize', columnName: 'deal_count', operation: 'sum' },
      { type: 'summarize', columnName: 'avg_deal_size', operation: 'average' },
      { type: 'summarize', columnName: 'won_amount', operation: 'sum' },
    ],
  },
  // ステージ別金額（集計済みクエリテーブルから。ゼロ起点棒）
  {
    baseTableName: 'Stage_Conversion',
    title: 'ステージ別パイプライン金額（集計済み）',
    description: 'ボトルネックステージを特定。最大金額ステージに注目',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Stage', operation: 'actual' },
      { type: 'yAxis', columnName: 'total_amount', operation: 'sum' },
    ],
  },
  // ステージ別ファネル（金額ベース）
  {
    baseTableName: 'Stage_Conversion',
    title: '営業ファネル：金額ベースのステージ推移',
    description: 'どのステージ間で金額が最も減少するかを可視化',
    reportType: 'chart',
    chartType: 'funnel',
    axisColumns: [
      { type: 'xAxis', columnName: 'Stage', operation: 'actual' },
      { type: 'yAxis', columnName: 'total_amount', operation: 'sum' },
    ],
  },
  // リードソース効果（集計済み）
  {
    baseTableName: 'Source_Analysis',
    title: 'チャネル効果測定：ソース別金額と確度',
    description: 'どのチャネルからの案件が金額・確度ともに高いか',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Lead_Source', operation: 'actual' },
      { type: 'yAxis', columnName: 'total_amount', operation: 'sum' },
    ],
  },
  // リードソース×ステータス品質（クロス集計）
  {
    baseTableName: 'Lead_Quality',
    title: 'リードソース品質：ソース×ステータス',
    description: 'どのチャネルからのリードがQualifiedに到達しやすいか',
    reportType: 'pivot',
    axisColumns: [
      { type: 'row', columnName: 'Lead_Source', operation: 'actual' },
      { type: 'column', columnName: 'Lead_Status', operation: 'actual' },
      { type: 'data', columnName: 'lead_count', operation: 'sum' },
    ],
  },
  // ステージ別件数と平均金額（コンボ代替: 2つの棒レポート）
  {
    baseTableName: 'Stage_Conversion',
    title: 'ステージ別の案件数分布',
    description: '件数ベースでどのステージに案件が集中しているか',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Stage', operation: 'actual' },
      { type: 'yAxis', columnName: 'deal_count', operation: 'sum' },
    ],
  },
];

async function main() {
  console.log('=== Layer 2-3: 改善レポートパイプライン ===\n');

  const token = await getToken();
  console.log('✅ Token取得完了\n');

  // Layer 2: クエリテーブル作成
  console.log('--- Layer 2: KPI集計クエリテーブル ---');
  const qtResults = {};
  for (const qt of QUERY_TABLES) {
    console.log(`\n[QT] ${qt.name}: ${qt.description}`);
    const viewId = await createQueryTable(token, qt.name, qt.sql);
    qtResults[qt.name] = viewId;
    await sleep(1500);
  }

  console.log('\n--- Layer 3: 改善レポート作成 ---');
  const reportResults = [];
  for (let i = 0; i < REPORTS.length; i++) {
    const r = REPORTS[i];
    console.log(`\n[${i + 1}/${REPORTS.length}] ${r.title} (${r.chartType || r.reportType})`);
    const viewId = await createReport(token, r);
    reportResults.push({ title: r.title, type: r.chartType || r.reportType, viewId });
    await sleep(1500);
  }

  // 結果サマリー
  console.log('\n=== 結果サマリー ===');
  console.log('\nクエリテーブル:');
  for (const [name, id] of Object.entries(qtResults)) {
    console.log(`  ${id ? '✅' : '❌'} ${name}: ${id || 'FAILED'}`);
  }
  console.log('\nレポート:');
  const ok = reportResults.filter(r => r.viewId);
  const ng = reportResults.filter(r => !r.viewId);
  console.log(`  成功: ${ok.length}/${reportResults.length}`);
  ok.forEach(r => {
    console.log(`  📊 ${r.title} → https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${r.viewId}`);
  });
  if (ng.length) {
    console.log(`  失敗: ${ng.map(r => r.title).join(', ')}`);
  }

  const result = {
    created: new Date().toISOString(),
    queryTables: qtResults,
    reports: reportResults,
  };
  require('fs').writeFileSync('./enhanced-reports-result.json', JSON.stringify(result, null, 2));
  console.log('\n結果を enhanced-reports-result.json に保存');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
