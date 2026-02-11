// Zoho CRM 税額計算機能セットアップスクリプト
// common-errors.md パターン適用版

import { readFileSync } from 'fs';

// .env読み込み（dotenv不要パターン）
function loadEnv(path = '.env') {
  const content = readFileSync(path, 'utf-8');
  content.split('\n').forEach(line => {
    if (line.startsWith('#') || !line.includes('=')) return;
    const [key, ...val] = line.split('=');
    process.env[key.trim()] = val.join('=').trim();
  });
}

loadEnv();

const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ORG_ID, ZOHO_DATA_CENTER } = process.env;
const dc = ZOHO_DATA_CENTER?.toLowerCase() || 'jp';

// 安全なAPI呼び出しラッパー
async function safeApiCall(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    if (!text) {
      return { error: 'empty_response', status: res.status };
    }

    if (text.startsWith('<')) {
      return { error: 'html_response', hint: 'Check auth URL or credentials' };
    }

    return JSON.parse(text);
  } catch (e) {
    return { error: 'fetch_failed', message: e.message };
  }
}

// トークン取得（正しいsoidフォーマット）
async function getAccessToken() {
  const soid = `ZohoCRM.${ZOHO_ORG_ID}`;
  const url = `https://accounts.zoho.${dc}/oauth/v2/token`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    soid: soid,
    scope: 'ZohoCRM.settings.ALL,ZohoCRM.modules.ALL'
  });

  const data = await safeApiCall(url, { method: 'POST', body: params });
  if (data.error || !data.access_token) {
    throw new Error(`Token error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// フィールド作成
async function createField(token, module, fieldData) {
  const url = `https://www.zohoapis.${dc}/crm/v8/settings/fields?module=${module}`;
  return await safeApiCall(url, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: [fieldData] })
  });
}

// 変数グループ取得
async function getVariableGroups(token) {
  const url = `https://www.zohoapis.${dc}/crm/v8/settings/variable_groups`;
  return await safeApiCall(url, {
    headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
  });
}

// 組織変数作成
async function createOrgVariable(token, varData) {
  const url = `https://www.zohoapis.${dc}/crm/v8/settings/variables`;
  return await safeApiCall(url, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ variables: [varData] })
  });
}

// メイン処理
async function main() {
  console.log('=== Phase 2: 環境構築 ===\n');

  // Step 0: トークン取得
  console.log('Step 0: 認証');
  const token = await getAccessToken();
  console.log('  ✅ トークン取得成功\n');

  // Step 1: カスタムフィールド作成
  console.log('Step 1: カスタムフィールド作成');

  const fieldsToCreate = [
    { field_label: '金額', api_name: 'Amount_Custom', data_type: 'currency', length: 16 },
    { field_label: '税額', api_name: 'Tax_Amount', data_type: 'currency', length: 16 },
    { field_label: '税込合計', api_name: 'Total_Amount', data_type: 'currency', length: 16 }
  ];

  for (const field of fieldsToCreate) {
    const result = await createField(token, 'Deals', field);
    if (result.fields?.[0]?.status === 'success') {
      console.log(`  ✅ ${field.field_label} (${field.api_name}) 作成成功`);
    } else if (result.fields?.[0]?.code === 'DUPLICATE_DATA') {
      console.log(`  ⏭️ ${field.field_label} (${field.api_name}) 既に存在`);
    } else {
      console.log(`  ⚠️ ${field.field_label}: ${JSON.stringify(result)}`);
    }
  }

  // Step 2: 組織変数作成
  console.log('\nStep 2: 組織変数作成');

  const groups = await getVariableGroups(token);
  const generalGroup = groups.variable_groups?.find(g => g.name === 'General');

  if (generalGroup) {
    const varResult = await createOrgVariable(token, {
      name: 'DEFAULT_TAX_RATE',
      value: '0.10',
      type: 'text',
      variable_group: { id: generalGroup.id },
      description: '消費税率（10%）'
    });

    if (varResult.variables?.[0]?.status === 'success') {
      console.log('  ✅ DEFAULT_TAX_RATE 作成成功');
    } else if (varResult.variables?.[0]?.code === 'DUPLICATE_DATA') {
      console.log('  ⏭️ DEFAULT_TAX_RATE 既に存在');
    } else {
      console.log('  ⚠️ 組織変数:', JSON.stringify(varResult));
    }
  } else {
    console.log('  ⚠️ Generalグループが見つかりません');
    console.log('    利用可能なグループ:', groups.variable_groups?.map(g => g.name));
  }

  console.log('\n=== 環境構築完了 ===');
  console.log('\n次のステップ: Phase 3（Delugeスクリプト作成）');
}

main().catch(e => {
  console.error('エラー発生:', e.message);
  process.exit(1);
});
