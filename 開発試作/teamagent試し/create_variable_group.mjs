// 変数グループを作成してから変数を作成
import { readFileSync } from 'fs';

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

  const res = await fetch(url, { method: 'POST', body: params });
  const data = await res.json();
  return data.access_token;
}

const token = await getAccessToken();

// Step 1: 変数グループを作成
console.log('=== 変数グループ作成 ===');
const groupRes = await fetch(`https://www.zohoapis.${dc}/crm/v8/settings/variable_groups`, {
  method: 'POST',
  headers: {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    variable_groups: [{
      name: 'General',
      display_label: '一般設定',
      description: '一般的な設定変数'
    }]
  })
});
const groupText = await groupRes.text();
console.log('Status:', groupRes.status);
console.log('Response:', groupText);

if (groupRes.status === 201 || groupRes.status === 200) {
  const groupData = JSON.parse(groupText);
  const groupId = groupData.variable_groups?.[0]?.details?.id;

  if (groupId) {
    console.log('\n✅ 変数グループ作成成功 ID:', groupId);

    // Step 2: 変数を作成
    console.log('\n=== 組織変数作成 ===');
    const varRes = await fetch(`https://www.zohoapis.${dc}/crm/v8/settings/variables`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variables: [{
          name: 'DEFAULT_TAX_RATE',
          value: '0.10',
          type: 'text',
          variable_group: { id: groupId },
          description: '消費税率（10%）'
        }]
      })
    });
    const varText = await varRes.text();
    console.log('Status:', varRes.status);
    console.log('Response:', varText);
  }
} else {
  console.log('⚠️ 変数グループ作成に失敗しました');
}
