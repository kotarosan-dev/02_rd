// 変数グループのレスポンス構造を確認
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
    scope: 'ZohoCRM.settings.ALL,ZohoCRM.modules.ALL,ZohoCRM.org.ALL'
  });

  const res = await fetch(url, { method: 'POST', body: params });
  const data = await res.json();
  return data.access_token;
}

const token = await getAccessToken();

// 変数グループ
const groupsRes = await fetch(`https://www.zohoapis.${dc}/crm/v8/settings/variable_groups`, {
  headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
});
const groupsText = await groupsRes.text();
console.log('=== 変数グループ レスポンス ===');
console.log('Status:', groupsRes.status);
console.log('Body:', groupsText);

// 既存の変数も確認
const varsRes = await fetch(`https://www.zohoapis.${dc}/crm/v8/settings/variables`, {
  headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
});
const varsText = await varsRes.text();
console.log('\n=== 既存の変数 ===');
console.log('Status:', varsRes.status);
console.log('Body:', varsText);
