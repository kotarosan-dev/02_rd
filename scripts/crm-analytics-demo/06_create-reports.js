// 06_create-reports.js
// Analytics Create Report API で書籍知見に基づくグラフを自動生成
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

async function createReport(token, config) {
  const url = `${ANA_API}/restapi/v2/workspaces/${WS_ID}/reports`;
  const body = new URLSearchParams({ CONFIG: JSON.stringify(config) });

  const r = await fetch(url, {
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
    console.log(`  ✅ viewId: ${d.data?.viewId}`);
    return d.data?.viewId;
  }
  console.log(`  ⚠️ Error:`, JSON.stringify(d).slice(0, 400));
  return null;
}

// --- レポート定義（書籍知見に基づく設計） ---
// 参照: 『データビジュアライゼーションの基礎』『HBR流データビジュアライゼーション』
//       『最高の結果を出すKPIマネジメント』

const REPORTS = [
  // 1. 棒グラフ: ステージ別パイプライン金額（ゼロ起点必須、カテゴリ比較）
  {
    baseTableName: 'CRM_Deals_Pipeline',
    title: 'パイプライン分析：ステージ別金額',
    description: '各営業ステージの合計金額。ボトルネックステージを特定し、営業プロセスの滞留を可視化する',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Stage', operation: 'actual' },
      { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
    ],
  },

  // 2. 円グラフ: リードソース別案件構成比（全体割合、シンプルなカテゴリ数）
  {
    baseTableName: 'CRM_Deals_Pipeline',
    title: 'リードソース別案件構成',
    description: 'どのチャネルからの案件が多いか。マーケティング投資配分の判断材料',
    reportType: 'chart',
    chartType: 'pie',
    axisColumns: [
      { type: 'xAxis', columnName: 'Lead_Source', operation: 'actual' },
      { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
    ],
  },

  // 3. 横棒グラフ: 案件ランキング（金額降順、直接ラベルが有効）
  {
    baseTableName: 'CRM_Deals_Pipeline',
    title: '案件金額ランキング',
    description: '個別案件の金額を一覧比較。注力すべき大型案件を即座に識別する',
    reportType: 'chart',
    chartType: 'horizontal bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Deal_Name', operation: 'actual' },
      { type: 'yAxis', columnName: 'Amount', operation: 'sum' },
    ],
  },

  // 4. ファネル: 営業プロセスのコンバージョン可視化
  {
    baseTableName: 'CRM_Deals_Pipeline',
    title: '営業ファネル：ステージ別案件数',
    description: '各ステージの案件数をファネル形式で表示。どこで案件が落ちているかを直感的に把握',
    reportType: 'chart',
    chartType: 'funnel',
    axisColumns: [
      { type: 'xAxis', columnName: 'Stage', operation: 'actual' },
      { type: 'yAxis', columnName: 'Deal_Name', operation: 'count' },
    ],
  },

  // 5. リード分析: 業種別リード数（棒グラフ、カテゴリ量比較）
  {
    baseTableName: 'CRM_Leads_Overview',
    title: 'リード分析：業種別リード数',
    description: 'どの業種からリードが多いか。ターゲット業種の妥当性を検証する',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Industry', operation: 'actual' },
      { type: 'yAxis', columnName: 'Full_Name', operation: 'count' },
    ],
  },

  // 6. リード分析: ステータス別構成（横棒グラフ）
  {
    baseTableName: 'CRM_Leads_Overview',
    title: 'リードステータス分布',
    description: 'リードの進捗状態を可視化。フォローアップが必要なリードの量を把握',
    reportType: 'chart',
    chartType: 'horizontal bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Lead_Status', operation: 'actual' },
      { type: 'yAxis', columnName: 'Full_Name', operation: 'count' },
    ],
  },

  // 7. サマリーテーブル: ステージ×リードソースのクロス集計
  {
    baseTableName: 'CRM_Deals_Pipeline',
    title: 'ステージ×リードソース クロス集計',
    description: 'どのチャネル経由の案件がどのステージにいるか。チャネル品質の多角的評価',
    reportType: 'pivot',
    axisColumns: [
      { type: 'row', columnName: 'Stage', operation: 'actual' },
      { type: 'column', columnName: 'Lead_Source', operation: 'actual' },
      { type: 'data', columnName: 'Amount', operation: 'sum' },
    ],
  },

  // 8. リードソース別リード獲得（棒 + リードテーブル）
  {
    baseTableName: 'CRM_Leads_Overview',
    title: 'リードソース効果測定',
    description: 'チャネル別のリード獲得数。マーケティングROI評価の基礎データ',
    reportType: 'chart',
    chartType: 'bar',
    axisColumns: [
      { type: 'xAxis', columnName: 'Lead_Source', operation: 'actual' },
      { type: 'yAxis', columnName: 'Full_Name', operation: 'count' },
    ],
  },
];

async function main() {
  console.log('=== レポート（グラフ）自動生成開始 ===');
  console.log(`ワークスペース: ${WS_ID}`);
  console.log(`レポート数: ${REPORTS.length}\n`);

  const token = await getToken();
  console.log('✅ Token取得完了\n');

  const results = [];

  for (let i = 0; i < REPORTS.length; i++) {
    const r = REPORTS[i];
    console.log(`[${i + 1}/${REPORTS.length}] ${r.title} (${r.chartType || r.reportType})`);
    const viewId = await createReport(token, r);
    results.push({ title: r.title, type: r.chartType || r.reportType, viewId });
    if (i < REPORTS.length - 1) await sleep(1500);
  }

  console.log('\n=== 生成結果サマリー ===');
  const ok = results.filter(r => r.viewId);
  const ng = results.filter(r => !r.viewId);
  console.log(`成功: ${ok.length}/${results.length}`);
  if (ng.length) console.log('失敗:', ng.map(r => r.title).join(', '));

  ok.forEach(r => {
    console.log(`  📊 ${r.title} → https://analytics.zoho.${DC}/workspace/${WS_ID}/view/${r.viewId}`);
  });

  require('fs').writeFileSync(
    './reports-result.json',
    JSON.stringify({ created: new Date().toISOString(), reports: results }, null, 2)
  );
  console.log('\n結果を reports-result.json に保存しました');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
