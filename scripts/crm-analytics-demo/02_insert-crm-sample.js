// 02_insert-crm-sample.js
// CRM にサンプルデータ（Leads 10件 + Deals 8件）を投入する
const fetch = require('node-fetch');
const { getAccessToken, API_DOMAIN } = require('./zoho-auth');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ==============================
// サンプルデータ定義
// ==============================

// 架空の日本企業B2B営業シナリオ
const LEADS = [
  { Last_Name: '田中', First_Name: '太郎', Company: '株式会社フューチャーテック', Title: '情報システム部長', Email: 'tanaka@futuretech-sample.jp', Phone: '0312345001', Lead_Source: 'Web Site', Lead_Status: 'Contacted', Industry: 'Technology', No_of_Employees: 150, Annual_Revenue: 300000000, Description: 'Zoho CRM導入に関心あり。現在Excelで管理。' },
  { Last_Name: '鈴木', First_Name: '花子', Company: '合同会社サクラメディア', Title: 'マーケティング部長', Email: 'suzuki@sakuramedia-sample.jp', Phone: '0312345002', Lead_Source: 'Advertisement', Lead_Status: 'Not Contacted', Industry: 'Media', No_of_Employees: 45, Annual_Revenue: 80000000, Description: 'SNS広告経由。メールマーケ自動化に興味。' },
  { Last_Name: '佐藤', First_Name: '健一', Company: '株式会社グリーンソリューション', Title: '代表取締役', Email: 'sato@greensol-sample.jp', Phone: '0312345003', Lead_Source: 'Seminar', Lead_Status: 'Qualified', Industry: 'Consulting', No_of_Employees: 30, Annual_Revenue: 120000000, Description: 'セミナー参加。DX化を検討中。決裁者。' },
  { Last_Name: '山田', First_Name: '次郎', Company: '医療法人ひかりクリニック', Title: '事務局長', Email: 'yamada@hikari-clinic-sample.jp', Phone: '0312345004', Lead_Source: 'Partner', Lead_Status: 'Contacted', Industry: 'Healthcare', No_of_Employees: 80, Annual_Revenue: 250000000, Description: 'パートナー紹介。電子カルテ連携に興味。' },
  { Last_Name: '伊藤', First_Name: '美咲', Company: '株式会社ハーベスト不動産', Title: '営業推進課長', Email: 'ito@harvest-re-sample.jp', Phone: '0312345005', Lead_Source: 'Web Site', Lead_Status: 'Not Contacted', Industry: 'Real Estate', No_of_Employees: 200, Annual_Revenue: 800000000, Description: 'ウェブサイトから問い合わせ。顧客管理改善希望。' },
  { Last_Name: '渡辺', First_Name: '翔', Company: '有限会社ウェーブデザイン', Title: 'CEO', Email: 'watanabe@wavedesign-sample.jp', Phone: '0312345006', Lead_Source: 'Cold Call', Lead_Status: 'Unqualified', Industry: 'Design', No_of_Employees: 12, Annual_Revenue: 40000000, Description: 'コールドコール。予算少なめ。' },
  { Last_Name: '中村', First_Name: '恵', Company: '株式会社ネクストロジスティクス', Title: 'IT推進室長', Email: 'nakamura@nextlogis-sample.jp', Phone: '0312345007', Lead_Source: 'Internal Seminar', Lead_Status: 'Qualified', Industry: 'Transportation', No_of_Employees: 500, Annual_Revenue: 2000000000, Description: '社内セミナー。大手物流。予算承認フロー確認中。' },
  { Last_Name: '小林', First_Name: '誠', Company: '学校法人ブルースカイ学園', Title: '経営企画課長', Email: 'kobayashi@bluesky-gakuen-sample.jp', Phone: '0312345008', Lead_Source: 'Web Site', Lead_Status: 'Contacted', Industry: 'Education', No_of_Employees: 180, Annual_Revenue: 600000000, Description: '教育機関。管理業務効率化ニーズあり。' },
  { Last_Name: '加藤', First_Name: '由美', Company: '株式会社スマートリテール', Title: '店舗運営部長', Email: 'kato@smartretail-sample.jp', Phone: '0312345009', Lead_Source: 'Trade Show', Lead_Status: 'Contacted', Industry: 'Retail', No_of_Employees: 350, Annual_Revenue: 1500000000, Description: '展示会にて名刺交換。EC在庫管理連携に興味。' },
  { Last_Name: '吉田', First_Name: '浩二', Company: '合同会社テックスタートアップ', Title: 'CTO', Email: 'yoshida@techstartup-sample.jp', Phone: '0312345010', Lead_Source: 'Web Site', Lead_Status: 'Qualified', Industry: 'Technology', No_of_Employees: 20, Annual_Revenue: 60000000, Description: 'スタートアップ。成長フェーズでCRM整備急務。' },
];

const DEALS = [
  { Deal_Name: 'フューチャーテック CRM導入', Amount: 1200000, Stage: 'Qualification', Probability: 30, Closing_Date: '2026-06-30', Lead_Source: 'Web Site', Type: 'New Business', Description: 'CRM初期導入50ライセンス' },
  { Deal_Name: 'グリーンソリューション DX支援', Amount: 3500000, Stage: 'Value Proposition', Probability: 50, Closing_Date: '2026-05-31', Lead_Source: 'Seminar', Type: 'New Business', Description: 'Zoho One 全社展開' },
  { Deal_Name: 'ネクストロジスティクス 基幹連携', Amount: 8000000, Stage: 'Proposal/Price Quote', Probability: 60, Closing_Date: '2026-07-31', Lead_Source: 'Internal Seminar', Type: 'New Business', Description: '物流システムとのAPI連携開発' },
  { Deal_Name: 'ひかりクリニック 電子化', Amount: 2400000, Stage: 'Needs Analysis', Probability: 40, Closing_Date: '2026-06-15', Lead_Source: 'Partner', Type: 'New Business', Description: '予約管理・請求管理連携' },
  { Deal_Name: 'スマートリテール EC連携', Amount: 5500000, Stage: 'Id. Decision Makers', Probability: 45, Closing_Date: '2026-08-31', Lead_Source: 'Trade Show', Type: 'New Business', Description: '在庫・顧客データ統合' },
  { Deal_Name: 'ブルースカイ学園 管理DX', Amount: 1800000, Stage: 'Perception Analysis', Probability: 55, Closing_Date: '2026-05-15', Lead_Source: 'Web Site', Type: 'New Business', Description: '学籍・財務管理システム整備' },
  { Deal_Name: 'テックスタートアップ CRM', Amount: 600000, Stage: 'Closed Won', Probability: 100, Closing_Date: '2026-03-15', Lead_Source: 'Web Site', Type: 'New Business', Description: '小規模スタート。拡張余地あり。' },
  { Deal_Name: 'ハーベスト不動産 顧客管理', Amount: 4200000, Stage: 'Negotiation/Review', Probability: 75, Closing_Date: '2026-04-30', Lead_Source: 'Web Site', Type: 'Existing Business', Description: '既存システムからの移行' },
];

async function createRecord(token, module, data) {
  const res = await fetch(`${API_DOMAIN}/crm/v8/${module}`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: [data], trigger: [] }),
  });
  return res.json();
}

async function main() {
  const token = await getAccessToken(
    'ZohoCRM',
    'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.coql.READ'
  );
  console.log('=== CRM サンプルデータ投入 ===\n');

  // Leads 投入
  console.log('▶ Leads 投入中...');
  const leadIds = [];
  for (let i = 0; i < LEADS.length; i++) {
    const result = await createRecord(token, 'Leads', LEADS[i]);
    if (result.data && result.data[0].status === 'success') {
      const id = result.data[0].details.id;
      leadIds.push(id);
      console.log(`  ✅ Lead[${i + 1}] ${LEADS[i].Last_Name} ${LEADS[i].First_Name} / ${LEADS[i].Company} → ID: ${id}`);
    } else {
      console.log(`  ❌ Lead[${i + 1}] ${LEADS[i].Last_Name}: ${JSON.stringify(result.data?.[0] || result).slice(0, 120)}`);
    }
    await sleep(300);
  }

  // Deals 投入
  console.log('\n▶ Deals 投入中...');
  const dealIds = [];
  for (let i = 0; i < DEALS.length; i++) {
    const result = await createRecord(token, 'Deals', DEALS[i]);
    if (result.data && result.data[0].status === 'success') {
      const id = result.data[0].details.id;
      dealIds.push(id);
      console.log(`  ✅ Deal[${i + 1}] ${DEALS[i].Deal_Name} ¥${DEALS[i].Amount.toLocaleString()} → ID: ${id}`);
    } else {
      console.log(`  ❌ Deal[${i + 1}] ${DEALS[i].Deal_Name}: ${JSON.stringify(result.data?.[0] || result).slice(0, 120)}`);
    }
    await sleep(300);
  }

  console.log('\n=== 投入完了 ===');
  console.log(`Leads: ${leadIds.length}件 / Deals: ${dealIds.length}件`);

  // 結果を保存（Analytics インポート用）
  const fs = require('fs');
  fs.writeFileSync('./crm-record-ids.json', JSON.stringify({ leadIds, dealIds }, null, 2));
  console.log('→ crm-record-ids.json に ID を保存しました');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
