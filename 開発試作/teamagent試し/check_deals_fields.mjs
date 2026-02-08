import { readFileSync } from 'fs';
const envContent = readFileSync('.env', 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && !key.startsWith('#')) {
    process.env[key.trim()] = val.join('=').trim();
  }
});

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
  
  console.log("Debug - soid:", soid);
  const res = await fetch(url, { method: 'POST', body: params });
  const data = await res.json();
  if (!data.access_token) {
    console.log("Debug - Response:", JSON.stringify(data));
    throw new Error("Token fetch failed");
  }
  return data.access_token;
}

async function getDealsFields(token) {
  const url = `https://www.zohoapis.${dc}/crm/v8/settings/fields?module=Deals`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
  });
  return await res.json();
}

const token = await getAccessToken();
console.log("Token取得成功");
const fields = await getDealsFields(token);

console.log("\n=== 商談モジュール 数値系フィールド ===");
fields.fields?.forEach(f => {
  if (['currency', 'double', 'integer', 'decimal'].includes(f.data_type)) {
    console.log(`  ${f.field_label} (${f.api_name}) - ${f.data_type}`);
  }
});
console.log("\n=== 全フィールド数:", fields.fields?.length);
