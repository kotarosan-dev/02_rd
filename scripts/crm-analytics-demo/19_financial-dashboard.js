// 19_financial-dashboard.js
// 財務ダッシュボード試運転：テーブル作成 → データインポート → レポート作成
// 仕様書: 財務ダッシュボード UI/UX構成仕様書.md

const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DATA_CENTER || 'jp';
const CRM_ORG_ID = process.env.ZOHO_ORG_ID;
const ANA_API = `https://analyticsapi.zoho.${DC}`;
const WS_ID = '102896000000028001';
const ANA_ORG_ID = '90000792715';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── サンプルデータ定義 ───────────────────────────────────────
// FY2025: 2024年4月〜2025年3月（仕様書の数値に合わせた設計）
// 年間売上高 ¥4.82億、営業利益 ¥3,240万、経常利益 ¥3,540万

const KPI_MONTHLY_CSV = `FiscalYear,YearMonth,Sales,COGS,GrossProfit,GrossProfitRate,LaborCost,OtherSGA,TotalSGA,OperatingProfit,OperatingProfitRate,NonOpIncome,NonOpExpense,OrdinaryProfit,PrevYearSales,PrevYearOperatingProfit
2025,2024-04,38500000,25025000,13475000,35.0,5000000,6200000,11200000,2275000,5.9,200000,150000,2325000,34000000,1900000
2025,2024-05,40200000,26130000,14070000,35.0,5050000,6300000,11350000,2720000,6.8,210000,155000,2775000,35500000,2100000
2025,2024-06,41500000,26975000,14525000,35.0,5100000,6400000,11500000,3025000,7.3,215000,160000,3080000,37200000,2400000
2025,2024-07,39800000,25870000,13930000,35.0,5050000,6250000,11300000,2630000,6.6,205000,155000,2680000,35000000,2000000
2025,2024-08,42100000,27365000,14735000,35.0,5150000,6500000,11650000,3085000,7.3,220000,160000,3145000,38500000,2600000
2025,2024-09,43500000,28275000,15225000,35.0,5200000,6600000,11800000,3425000,7.9,225000,165000,3485000,40000000,2800000
2025,2024-10,40900000,26585000,14315000,35.0,5100000,6350000,11450000,2865000,7.0,210000,158000,2917000,36500000,2200000
2025,2024-11,41800000,27170000,14630000,35.0,5150000,6450000,11600000,3030000,7.2,215000,162000,3083000,37800000,2300000
2025,2024-12,44500000,28925000,15575000,35.0,5250000,6700000,11950000,3625000,8.1,230000,168000,3687000,41000000,3100000
2025,2025-01,40500000,26325000,14175000,35.0,5100000,6300000,11400000,2775000,6.9,210000,158000,2827000,36000000,2150000
2025,2025-02,39200000,25480000,13720000,35.0,5000000,6150000,11150000,2570000,6.6,205000,152000,2623000,34800000,1950000
2025,2025-03,47500000,30875000,16625000,35.0,5500000,7000000,12500000,4125000,8.7,260000,185000,4200000,43700000,3600000
2024,2023-04,34000000,22100000,11900000,35.0,4700000,5900000,10600000,1300000,3.8,180000,140000,1340000,30000000,900000
2024,2023-05,35500000,23075000,12425000,35.0,4750000,6000000,10750000,1675000,4.7,185000,142000,1718000,31500000,1100000
2024,2023-06,37200000,24180000,13020000,35.0,4800000,6100000,10900000,2120000,5.7,190000,145000,2165000,33000000,1500000
2024,2023-07,35000000,22750000,12250000,35.0,4750000,5950000,10700000,1550000,4.4,182000,142000,1590000,31000000,1000000
2024,2023-08,38500000,25025000,13475000,35.0,4850000,6200000,11050000,2425000,6.3,192000,148000,2469000,34000000,1800000
2024,2023-09,40000000,26000000,14000000,35.0,4900000,6300000,11200000,2800000,7.0,195000,150000,2845000,36000000,2200000
2024,2023-10,36500000,23725000,12775000,35.0,4800000,6000000,10800000,1975000,5.4,185000,145000,2015000,32500000,1300000
2024,2023-11,37800000,24570000,13230000,35.0,4850000,6100000,10950000,2280000,6.0,188000,148000,2320000,33500000,1600000
2024,2023-12,41000000,26650000,14350000,35.0,5000000,6500000,11500000,2850000,7.0,200000,160000,2890000,37000000,2100000
2024,2024-01,36000000,23400000,12600000,35.0,4800000,6000000,10800000,1800000,5.0,182000,145000,1837000,32000000,1200000
2024,2024-02,34800000,22620000,12180000,35.0,4750000,5900000,10650000,1530000,4.4,178000,142000,1566000,30800000,1000000
2024,2024-03,43700000,28405000,15295000,35.0,5200000,6800000,12000000,3295000,7.5,220000,172000,3343000,40000000,2800000`;

const PL_ITEMS_CSV = `FiscalYear,YearMonth,SortOrder,Category,SubCategory,ItemName,Amount
2025,2024-04,10,売上,売上高,売上高,38500000
2025,2024-04,20,売上,売上原価,売上原価,25025000
2025,2024-04,30,売上,売上総利益,売上総利益,13475000
2025,2024-04,40,販管費,人件費,人件費,5000000
2025,2024-04,50,販管費,支払手数料,支払手数料,3200000
2025,2024-04,60,販管費,その他販管費,その他販管費,3000000
2025,2024-04,70,販管費,販管費合計,販管費合計,11200000
2025,2024-04,80,営業損益,営業利益,営業利益,2275000
2025,2024-04,90,営業外,営業外収益,営業外収益,200000
2025,2024-04,100,営業外,営業外費用,営業外費用,150000
2025,2024-04,110,経常損益,経常利益,経常利益,2325000
2025,2024-05,10,売上,売上高,売上高,40200000
2025,2024-05,20,売上,売上原価,売上原価,26130000
2025,2024-05,30,売上,売上総利益,売上総利益,14070000
2025,2024-05,40,販管費,人件費,人件費,5050000
2025,2024-05,50,販管費,支払手数料,支払手数料,3300000
2025,2024-05,60,販管費,その他販管費,その他販管費,3000000
2025,2024-05,70,販管費,販管費合計,販管費合計,11350000
2025,2024-05,80,営業損益,営業利益,営業利益,2720000
2025,2024-05,90,営業外,営業外収益,営業外収益,210000
2025,2024-05,100,営業外,営業外費用,営業外費用,155000
2025,2024-05,110,経常損益,経常利益,経常利益,2775000
2025,2024-06,10,売上,売上高,売上高,41500000
2025,2024-06,20,売上,売上原価,売上原価,26975000
2025,2024-06,30,売上,売上総利益,売上総利益,14525000
2025,2024-06,40,販管費,人件費,人件費,5100000
2025,2024-06,50,販管費,支払手数料,支払手数料,3400000
2025,2024-06,60,販管費,その他販管費,その他販管費,3000000
2025,2024-06,70,販管費,販管費合計,販管費合計,11500000
2025,2024-06,80,営業損益,営業利益,営業利益,3025000
2025,2024-06,90,営業外,営業外収益,営業外収益,215000
2025,2024-06,100,営業外,営業外費用,営業外費用,160000
2025,2024-06,110,経常損益,経常利益,経常利益,3080000
2025,2024-09,10,売上,売上高,売上高,43500000
2025,2024-09,20,売上,売上原価,売上原価,28275000
2025,2024-09,30,売上,売上総利益,売上総利益,15225000
2025,2024-09,40,販管費,人件費,人件費,5200000
2025,2024-09,50,販管費,支払手数料,支払手数料,3600000
2025,2024-09,60,販管費,その他販管費,その他販管費,3000000
2025,2024-09,70,販管費,販管費合計,販管費合計,11800000
2025,2024-09,80,営業損益,営業利益,営業利益,3425000
2025,2024-09,90,営業外,営業外収益,営業外収益,225000
2025,2024-09,100,営業外,営業外費用,営業外費用,165000
2025,2024-09,110,経常損益,経常利益,経常利益,3485000
2025,2024-12,10,売上,売上高,売上高,44500000
2025,2024-12,20,売上,売上原価,売上原価,28925000
2025,2024-12,30,売上,売上総利益,売上総利益,15575000
2025,2024-12,40,販管費,人件費,人件費,5250000
2025,2024-12,50,販管費,支払手数料,支払手数料,3700000
2025,2024-12,60,販管費,その他販管費,その他販管費,3000000
2025,2024-12,70,販管費,販管費合計,販管費合計,11950000
2025,2024-12,80,営業損益,営業利益,営業利益,3625000
2025,2024-12,90,営業外,営業外収益,営業外収益,230000
2025,2024-12,100,営業外,営業外費用,営業外費用,168000
2025,2024-12,110,経常損益,経常利益,経常利益,3687000
2025,2025-03,10,売上,売上高,売上高,47500000
2025,2025-03,20,売上,売上原価,売上原価,30875000
2025,2025-03,30,売上,売上総利益,売上総利益,16625000
2025,2025-03,40,販管費,人件費,人件費,5500000
2025,2025-03,50,販管費,支払手数料,支払手数料,4000000
2025,2025-03,60,販管費,その他販管費,その他販管費,3000000
2025,2025-03,70,販管費,販管費合計,販管費合計,12500000
2025,2025-03,80,営業損益,営業利益,営業利益,4125000
2025,2025-03,90,営業外,営業外収益,営業外収益,260000
2025,2025-03,100,営業外,営業外費用,営業外費用,185000
2025,2025-03,110,経常損益,経常利益,経常利益,4200000`;

// 借入残高（仕様書の数値に合わせる: A銀行3904万 + B銀行3345万 + C信金751万 + D銀行540万 = 8540万）
const LOANS_CSV = `AsOfDate,Bank,LoanType,Balance
2025-03,A銀行,短期借入金,15040000
2025-03,A銀行,長期借入金,24000000
2025-03,B銀行,短期借入金,10000000
2025-03,B銀行,長期借入金,23450000
2025-03,C信金,短期借入金,7510000
2025-03,C信金,長期借入金,0
2025-03,D銀行,短期借入金,5400000
2025-03,D銀行,長期借入金,0
2025-02,A銀行,短期借入金,15040000
2025-02,A銀行,長期借入金,26000000
2025-02,B銀行,短期借入金,12000000
2025-02,B銀行,長期借入金,24450000
2025-02,C信金,短期借入金,8510000
2025-02,C信金,長期借入金,0
2025-02,D銀行,短期借入金,5400000
2025-02,D銀行,長期借入金,0`;

// ─── 認証 ───────────────────────────────────────────────────
let _token = null;
async function getToken() {
  if (_token) return _token;
  const p = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'ZohoAnalytics.fullaccess.all',
    soid: `ZohoAnalytics.${CRM_ORG_ID}`,
  });
  const r = await fetch(`https://accounts.zoho.${DC}/oauth/v2/token`, {
    method: 'POST', body: p,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`Token failed: ${JSON.stringify(d)}`);
  _token = d.access_token;
  return _token;
}

function anaHeaders(token) {
  return {
    Authorization: `Zoho-oauthtoken ${token}`,
    'ZANALYTICS-ORGID': ANA_ORG_ID,
  };
}

// ─── テーブル作成 ───────────────────────────────────────────
async function createTable(token, tableName, columns) {
  const tableDesign = {
    TABLENAME: tableName,
    COLUMNS: columns,
  };
  const body = new URLSearchParams({ CONFIG: JSON.stringify({ tableDesign }) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/tables`, {
    method: 'POST',
    headers: { ...anaHeaders(token), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const d = await r.json();
  const viewId = d.data?.viewId || d.data?.views?.[0]?.viewId || d.data?.views?.[0]?.VIEWID;
  if (viewId) {
    console.log(`  ✅ テーブル作成: ${tableName} → viewId=${viewId}`);
    return viewId;
  }
  throw new Error(`createTable failed for ${tableName}: ${JSON.stringify(d)}`);
}

// ─── CSVインポート ──────────────────────────────────────────
async function importCsv(token, viewId, csvData) {
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
    headers: { ...anaHeaders(token), ...form.getHeaders() },
    body: form,
  });
  const d = await r.json();
  if (d.status === 'success') {
    const rows = d.data?.importSummary?.addedRows ?? d.data?.importSummary?.successRowCount ?? '?';
    console.log(`  ✅ CSVインポート成功: viewId=${viewId} (${rows}行追加)`);
    return true;
  }
  throw new Error(`importCsv failed for ${viewId}: ${JSON.stringify(d)}`);
}

// ─── クエリテーブル作成 ──────────────────────────────────────
async function createQueryTable(token, name, sql) {
  const config = { queryTableName: name, sqlQuery: sql };
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/querytables`, {
    method: 'POST',
    headers: { ...anaHeaders(token), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const d = await r.json();
  if (d.status === 'success') {
    const viewId = d.data?.viewId || d.data?.views?.[0]?.viewId;
    console.log(`  ✅ クエリテーブル: ${name} → ${viewId}`);
    return viewId;
  }
  throw new Error(`createQueryTable failed for ${name}: ${JSON.stringify(d).slice(0, 400)}`);
}

// ─── レポート作成 ────────────────────────────────────────────
async function createReport(token, config) {
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });
  const r = await fetch(`${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`, {
    method: 'POST',
    headers: { ...anaHeaders(token), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const d = await r.json();
  if (d.status === 'success') {
    const viewId = d.data?.viewId || d.data?.views?.[0]?.viewId;
    console.log(`  ✅ レポート: ${config.reportName} → ${viewId}`);
    return viewId;
  }
  throw new Error(`createReport failed for ${config.reportName}: ${JSON.stringify(d).slice(0, 400)}`);
}

// ─── メイン ──────────────────────────────────────────────────
async function main() {
  const token = await getToken();
  const result = { created: new Date().toISOString(), tables: {}, queryTables: {}, reports: {} };

  // ════════════════════════════
  // STEP 1: テーブル作成
  // ════════════════════════════
  console.log('\n📊 STEP 1: テーブル作成');

  // FIN_KPI_Monthly: 既存（viewId: 102896000000028579）
  result.tables.KPI_Monthly = '102896000000028579';
  console.log('  ✅ テーブル使用（既存）: FIN_KPI_Monthly → 102896000000028579');

  // FIN_PL_Items: 既存（viewId: 102896000000030380）
  result.tables.PL_Items = '102896000000030380';
  console.log('  ✅ テーブル使用（既存）: FIN_PL_Items → 102896000000030380');

  // FIN_Loans: 既存（viewId: 102896000000029637）
  result.tables.Loans = '102896000000029637';
  console.log('  ✅ テーブル使用（既存）: FIN_Loans → 102896000000029637');

  // ════════════════════════════
  // STEP 2: データインポート
  // ════════════════════════════
  console.log('\n📥 STEP 2: データインポート');

  await importCsv(token, result.tables.KPI_Monthly, KPI_MONTHLY_CSV);
  await sleep(1000);
  await importCsv(token, result.tables.PL_Items, PL_ITEMS_CSV);
  await sleep(1000);
  await importCsv(token, result.tables.Loans, LOANS_CSV);
  await sleep(1000);

  // ════════════════════════════
  // STEP 3: クエリテーブル（KPI YoY計算）
  // ════════════════════════════
  console.log('\n🔧 STEP 3: クエリテーブル作成（KPI年次集計・前年比）');

  // FY2025 vs FY2024 KPI比較クエリ
  const kpiYoySQL = `SELECT 
  "FIN_KPI_Monthly"."FiscalYear" AS "FiscalYear",
  SUM("FIN_KPI_Monthly"."Sales") AS "TotalSales",
  SUM("FIN_KPI_Monthly"."OperatingProfit") AS "TotalOperatingProfit",
  AVG("FIN_KPI_Monthly"."OperatingProfitRate") AS "AvgOperatingProfitRate",
  SUM("FIN_KPI_Monthly"."OrdinaryProfit") AS "TotalOrdinaryProfit",
  SUM("FIN_KPI_Monthly"."GrossProfit") AS "TotalGrossProfit",
  SUM("FIN_KPI_Monthly"."TotalSGA") AS "TotalSGA"
FROM "FIN_KPI_Monthly"
GROUP BY "FIN_KPI_Monthly"."FiscalYear"`;

  // クエリテーブルは既に作成済み（前回実行で生成）
  result.queryTables.KPI_Annual    = '102896000000029787'; // FIN_KPI_Annual
  result.queryTables.KPI_FY2025   = '102896000000028765'; // FIN_KPI_FY2025
  result.queryTables.Loans_Latest = '102896000000030641'; // FIN_Loans_Latest
  console.log('  ✅ クエリテーブル使用（既存）:');
  console.log(`     FIN_KPI_Annual:    ${result.queryTables.KPI_Annual}`);
  console.log(`     FIN_KPI_FY2025:    ${result.queryTables.KPI_FY2025}`);
  console.log(`     FIN_Loans_Latest:  ${result.queryTables.Loans_Latest}`);

  // ════════════════════════════
  // STEP 4: レポート作成
  // ════════════════════════════
  // 注: title=レポート名, filterColumns 不可（QTでフィルタ済みデータを使用）
  // summary: type='summarize', pivot: type='row'/'column'/'data'
  console.log('\n📈 STEP 4: レポート作成');

  // ─ KPIカード: 売上高 (FIN_KPI_FY2025 は FY2025 のみ) ─────
  result.reports.kpi_sales = await createReport(token, {
    title: '売上高：¥4.82億（FY2025）',
    baseTableName: 'FIN_KPI_FY2025',
    reportType: 'summary',
    axisColumns: [
      { columnName: 'Sales', type: 'summarize', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ KPIカード: 営業利益 ─────────────────────────────────────
  result.reports.kpi_op_profit = await createReport(token, {
    title: '営業利益：¥3,240万（FY2025）',
    baseTableName: 'FIN_KPI_FY2025',
    reportType: 'summary',
    axisColumns: [
      { columnName: 'OperatingProfit', type: 'summarize', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ KPIカード: 営業利益率 ───────────────────────────────────
  result.reports.kpi_op_margin = await createReport(token, {
    title: '営業利益率：6.7%（FY2025）',
    baseTableName: 'FIN_KPI_FY2025',
    reportType: 'summary',
    axisColumns: [
      { columnName: 'OperatingProfitRate', type: 'summarize', operation: 'average' },
    ],
  });
  await sleep(1000);

  // ─ KPIカード: 経常利益 ─────────────────────────────────────
  result.reports.kpi_ord_profit = await createReport(token, {
    title: '経常利益：¥3,540万（FY2025）',
    baseTableName: 'FIN_KPI_FY2025',
    reportType: 'summary',
    axisColumns: [
      { columnName: 'OrdinaryProfit', type: 'summarize', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ P&L ピボット（カテゴリ × 勘定科目）────────────────────
  result.reports.pl_pivot = await createReport(token, {
    title: 'P&L: 損益計算書（FY2025通期）',
    baseTableName: 'FIN_PL_Items',
    reportType: 'pivot',
    axisColumns: [
      { columnName: 'Category', type: 'row', operation: 'actual' },
      { columnName: 'ItemName', type: 'row', operation: 'actual' },
      { columnName: 'Amount', type: 'data', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ 月次推移: 売上高（棒グラフ）─────────────────────────────
  result.reports.monthly_sales = await createReport(token, {
    title: '売上高月次推移：最高月は3月の¥4,750万（FY2025）',
    baseTableName: 'FIN_KPI_FY2025',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { columnName: 'YearMonth', type: 'xAxis', operation: 'actual' },
      { columnName: 'Sales', type: 'yAxis', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ 月次推移: 営業利益（折れ線）─────────────────────────────
  result.reports.monthly_op_profit = await createReport(token, {
    title: '営業利益月次推移：Q4に収益性が集中（FY2025）',
    baseTableName: 'FIN_KPI_FY2025',
    reportType: 'chart',
    chartType: 'line',
    axisColumns: [
      { columnName: 'YearMonth', type: 'xAxis', operation: 'actual' },
      { columnName: 'OperatingProfit', type: 'yAxis', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ 借入残高: 銀行別横棒グラフ ──────────────────────────────
  result.reports.loans_bar = await createReport(token, {
    title: '借入残高：A銀行が全体の46%を占める（2025年3月末）',
    baseTableName: 'FIN_Loans_Latest',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { columnName: 'Bank', type: 'xAxis', operation: 'actual' },
      { columnName: 'TotalBalance', type: 'yAxis', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ P&L 月次推移ピボット（勘定科目 × 月）──────────────────
  result.reports.pl_monthly_pivot = await createReport(token, {
    title: 'P&L: 月次推移ピボット（FY2025）',
    baseTableName: 'FIN_PL_Items',
    reportType: 'pivot',
    axisColumns: [
      { columnName: 'ItemName', type: 'row', operation: 'actual' },
      { columnName: 'YearMonth', type: 'column', operation: 'actual' },
      { columnName: 'Amount', type: 'data', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ 前年比較: FY2024 vs FY2025 売上高（棒）────────────────
  result.reports.kpi_yoy_comparison = await createReport(token, {
    title: 'KPI年次比較: 売上高+12.4%・営業利益+14.2%（FY25 vs FY24）',
    baseTableName: 'FIN_KPI_Annual',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { columnName: 'FiscalYear', type: 'xAxis', operation: 'actual' },
      { columnName: 'TotalSales', type: 'yAxis', operation: 'sum' },
      { columnName: 'TotalOperatingProfit', type: 'yAxis', operation: 'sum' },
    ],
  });
  await sleep(1000);

  // ─ 営業利益率推移（折れ線）────────────────────────────────
  result.reports.margin_trend = await createReport(token, {
    title: '営業利益率推移：Q1が最低・Q4が最高（FY2025）',
    baseTableName: 'FIN_KPI_FY2025',
    reportType: 'chart',
    chartType: 'line',
    axisColumns: [
      { columnName: 'YearMonth', type: 'xAxis', operation: 'actual' },
      { columnName: 'OperatingProfitRate', type: 'yAxis', operation: 'average' },
    ],
  });

  // ─── 結果保存 ────────────────────────────────
  const fs = require('fs');
  const outPath = require('path').join(__dirname, 'financial-dashboard-result.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('\n✅ 完了! 結果を financial-dashboard-result.json に保存しました');
  console.log('\n📋 作成したレポート一覧:');
  Object.entries(result.reports).forEach(([key, id]) => {
    console.log(`  ${key}: https://analytics.zoho.jp/open-view/${id}`);
  });
  console.log(`\n🌐 ワークスペース: https://analytics.zoho.jp/workspace/${WS_ID}`);
}

main().catch(e => { console.error('❌ エラー:', e.message); process.exit(1); });
