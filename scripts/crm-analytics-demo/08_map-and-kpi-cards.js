// 08_map-and-kpi-cards.js
// 1. 都道府県別売上テーブル作成 + CSVインポート
// 2. マップレポート（map area: コロプレス）作成
// 3. KPIカード風 summary レポート（個別）作成
const fetch = require('node-fetch');
const FormData = require('form-data');
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

// --- テーブル作成 ---
// CONFIG形式: { tableDesign: { TABLENAME: "名前", COLUMNS: [{COLUMNNAME,DATATYPE}] } }
// カラムの DATATYPE は大文字: PLAIN / NUMBER / DATE / BOOLEAN
async function createTable(token, tableName, columns) {
  const config = { tableDesign: { TABLENAME: tableName, COLUMNS: columns } };
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/tables`, {
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
    console.log(`  ✅ Table created viewId: ${viewId}`);
    return viewId;
  }
  console.log(`  ⚠️ Table Error:`, JSON.stringify(d).slice(0, 400));
  return null;
}

// --- CSVインポート ---
async function importCsv(token, viewId, tableName, csvData) {
  const config = { importType: 'truncateadd', fileType: 'csv', autoIdentify: 'true', onError: 'setcolumnempty' };
  const form = new FormData();
  form.append('DATA', csvData);
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/views/${viewId}/data?CONFIG=${encodeURIComponent(JSON.stringify(config))}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'ZANALYTICS-ORGID': ANA_ORG_ID, ...form.getHeaders() },
    body: form,
  });
  const d = await r.json();
  if (d.status === 'success') {
    console.log(`  ✅ Import [${tableName}] rows: ${d.data?.importSummary?.successRowCount}`);
    return true;
  }
  console.log(`  ⚠️ Import Error [${tableName}]:`, JSON.stringify(d).slice(0, 400));
  return false;
}

// --- レポート作成 ---
async function createReport(token, config, label) {
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
    const viewId = d.data?.viewId;
    console.log(`  ✅ [${label}] viewId: ${viewId}`);
    console.log(`     → https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${viewId}`);
    return viewId;
  }
  console.log(`  ⚠️ [${label}] Error:`, JSON.stringify(d).slice(0, 400));
  return null;
}

// ============================================================
// デモデータ: 都道府県別売上（日本全国 16 都道府県）
// ============================================================
const PREFECTURE_CSV = `Prefecture,Region,Total_Amount,Deal_Count,Avg_Amount
東京都,関東,12500000,8,1562500
大阪府,近畿,8400000,6,1400000
愛知県,中部,6200000,5,1240000
神奈川県,関東,5800000,4,1450000
福岡県,九州,4100000,3,1366667
北海道,北海道,3200000,3,1066667
宮城県,東北,2800000,2,1400000
広島県,中国,2400000,2,1200000
京都府,近畿,2100000,2,1050000
兵庫県,近畿,1900000,2,950000
静岡県,中部,1700000,2,850000
埼玉県,関東,1600000,2,800000
千葉県,関東,1400000,2,700000
新潟県,中部,1200000,1,1200000
岡山県,中国,900000,1,900000
熊本県,九州,800000,1,800000`;

// ============================================================
// デモデータ: 現在のパイプライン実績（KPIカード用データを
//             既存 KPI_Summary クエリテーブルに乗せる）
// ============================================================

async function main() {
  console.log('=== Map + KPI Cards デモ ===\n');
  const token = await getToken();
  console.log('✅ Token 取得完了\n');

  // ---- Step 1: 都道府県テーブル作成 ----
  console.log('--- Step 1: 都道府県別売上テーブル ---');
  const prefViewId = await createTable(token, 'CRM_Sales_by_Prefecture', [
    { COLUMNNAME: 'Prefecture',   DATATYPE: 'PLAIN' },
    { COLUMNNAME: 'Region',       DATATYPE: 'PLAIN' },
    { COLUMNNAME: 'Total_Amount', DATATYPE: 'NUMBER' },
    { COLUMNNAME: 'Deal_Count',   DATATYPE: 'NUMBER' },
    { COLUMNNAME: 'Avg_Amount',   DATATYPE: 'NUMBER' },
  ]);
  if (!prefViewId) { console.error('テーブル作成失敗。終了'); process.exit(1); }
  await sleep(2000);

  // ---- Step 2: CSVインポート ----
  console.log('\n--- Step 2: 都道府県データ インポート ---');
  await importCsv(token, prefViewId, 'CRM_Sales_by_Prefecture', PREFECTURE_CSV);
  await sleep(2000);

  // ---- Step 3: マップレポート作成 ----
  console.log('\n--- Step 3: マップレポート（コロプレス）---');
  const mapViewId = await createReport(token, {
    baseTableName: 'CRM_Sales_by_Prefecture',
    title: '都道府県別パイプライン金額（関東・近畿・中部に集中）',
    description: 'コロプレスマップ。色が濃いほど金額が大きい。東京・大阪・愛知が上位3都府県',
    reportType: 'chart',
    chartType: 'map area',
    axisColumns: [
      { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
      { type: 'yAxis', columnName: 'Total_Amount', operation: 'sum' },
    ],
  }, 'map area（都道府県別金額）');
  await sleep(2000);

  // マップバブル（案件数）も試す
  const mapBubbleViewId = await createReport(token, {
    baseTableName: 'CRM_Sales_by_Prefecture',
    title: '都道府県別案件数マップ（バブル）',
    description: 'バブルの大きさが案件数を示す。東京・大阪がトップ2',
    reportType: 'chart',
    chartType: 'map bubble',
    axisColumns: [
      { type: 'xAxis', columnName: 'Prefecture', operation: 'actual' },
      { type: 'yAxis', columnName: 'Deal_Count', operation: 'sum' },
    ],
  }, 'map bubble（都道府県別件数）');
  await sleep(2000);

  // ---- Step 4: KPIカード風 summary レポート（個別）----
  console.log('\n--- Step 4: KPIカード風 summary レポート ---');

  // 4-1. 総パイプライン金額
  const kpiTotalViewId = await createReport(token, {
    baseTableName: 'KPI_Summary',
    title: '総パイプライン金額',
    description: '全案件の合計金額。目標達成率の分母',
    reportType: 'summary',
    axisColumns: [
      { type: 'summarize', columnName: 'total_pipeline', operation: 'sum' },
    ],
  }, 'KPI: 総パイプライン金額');
  await sleep(1500);

  // 4-2. 総案件数
  const kpiCountViewId = await createReport(token, {
    baseTableName: 'KPI_Summary',
    title: '総案件数',
    description: 'パイプライン内の全案件数',
    reportType: 'summary',
    axisColumns: [
      { type: 'summarize', columnName: 'deal_count', operation: 'sum' },
    ],
  }, 'KPI: 総案件数');
  await sleep(1500);

  // 4-3. 平均単価
  const kpiAvgViewId = await createReport(token, {
    baseTableName: 'KPI_Summary',
    title: '平均案件単価',
    description: '案件1件あたりの平均金額',
    reportType: 'summary',
    axisColumns: [
      { type: 'summarize', columnName: 'avg_deal_size', operation: 'average' },
    ],
  }, 'KPI: 平均案件単価');
  await sleep(1500);

  // 4-4. 受注金額
  const kpiWonViewId = await createReport(token, {
    baseTableName: 'KPI_Summary',
    title: '受注金額',
    description: 'Stage=受注の合計金額',
    reportType: 'summary',
    axisColumns: [
      { type: 'summarize', columnName: 'won_amount', operation: 'sum' },
    ],
  }, 'KPI: 受注金額');
  await sleep(1500);

  // 4-5. 最大案件金額
  const kpiMaxViewId = await createReport(token, {
    baseTableName: 'KPI_Summary',
    title: '最大案件金額',
    description: 'パイプライン内で最も大きい案件の金額',
    reportType: 'summary',
    axisColumns: [
      { type: 'summarize', columnName: 'max_deal', operation: 'sum' },
    ],
  }, 'KPI: 最大案件金額');
  await sleep(1500);

  // ---- 結果サマリー ----
  console.log('\n=== 結果サマリー ===');
  console.log('\n【地理データ】');
  console.log(`  テーブル: CRM_Sales_by_Prefecture (viewId: ${prefViewId})`);
  console.log('\n【マップレポート】');
  console.log(`  📍 コロプレスマップ: https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${mapViewId}`);
  console.log(`  📍 バブルマップ:     https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${mapBubbleViewId}`);
  console.log('\n【KPIカード（summaryレポート）】');
  [
    ['総パイプライン金額', kpiTotalViewId],
    ['総案件数',           kpiCountViewId],
    ['平均案件単価',       kpiAvgViewId],
    ['受注金額',           kpiWonViewId],
    ['最大案件金額',       kpiMaxViewId],
  ].forEach(([name, id]) => {
    if (id) console.log(`  💡 ${name}: https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${id}`);
  });

  console.log('\n✅ 全ステップ完了');
  console.log('次のステップ（GUI）:');
  console.log('  1. ダッシュボードを開き「編集」モードへ');
  console.log('  2. 上記レポートをドラッグ配置');
  console.log('  3. summaryレポートをKPIウィジェットとして配置すると数値カード化');

  require('fs').writeFileSync('./map-kpi-result.json', JSON.stringify({
    created: new Date().toISOString(),
    prefectureTable: { viewId: prefViewId },
    maps: { area: mapViewId, bubble: mapBubbleViewId },
    kpiCards: {
      totalPipeline: kpiTotalViewId,
      dealCount: kpiCountViewId,
      avgDealSize: kpiAvgViewId,
      wonAmount: kpiWonViewId,
      maxDeal: kpiMaxViewId,
    },
  }, null, 2));
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
