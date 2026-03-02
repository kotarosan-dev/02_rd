/**
 * Zoho Learn Refresh Token 取得スクリプト
 * 
 * 使い方:
 *   node get-tokens.mjs <grant_code>
 * 
 * grant_code は Developer Console の Self Client で取得。
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const grantCode = process.argv[2];
if (!grantCode) {
  console.error('Usage: node get-tokens.mjs <grant_code>');
  console.error('');
  console.error('Get the grant code from:');
  console.error('  https://accounts.zoho.jp/developerconsole');
  console.error('  → クライアントを選択 → 「Generate Code」 または「Self Client」');
  console.error('  Scope: ZohoLearn.course.READ,ZohoLearn.course.CREATE,ZohoLearn.course.UPDATE,ZohoLearn.lesson.CREATE,ZohoLearn.lesson.READ');
  process.exit(1);
}

const TLD = (process.env.ZOHO_DATA_CENTER || process.env.ZOHO_DC || 'jp').toLowerCase() === 'jp' ? 'jp' : 'com';
const ACCOUNTS_URL = `https://accounts.zoho.${TLD}`;

console.log(`Exchanging grant code at ${ACCOUNTS_URL}...`);
const params = new URLSearchParams({
  code: grantCode,
  client_id: process.env.ZOHO_CLIENT_ID,
  client_secret: process.env.ZOHO_CLIENT_SECRET,
  redirect_uri: 'https://www.zoho.com',
  grant_type: 'authorization_code',
});

const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, { method: 'POST', body: params });
const data = await res.json();
console.log('\n=== Response ===');
console.log(JSON.stringify(data, null, 2));

if (data.refresh_token) {
  console.log('\n✅ 成功！.env に以下を追加してください:');
  console.log(`ZOHO_LEARN_REFRESH_TOKEN=${data.refresh_token}`);
  console.log('ZOHO_LEARN_PORTAL_URL=kotarosan-portal');
  
  // 動作確認
  const accessToken = data.access_token;
  if (accessToken) {
    console.log('\n=== APIテスト ===');
    const portal = 'kotarosan-portal';
    const apiUrl = `https://learn.zoho.${TLD}/learn/api/v1/portal/${portal}/course?limit=5`;
    const r = await fetch(apiUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' }
    });
    const text = await r.text();
    console.log(`GET /portal/${portal}/course => HTTP ${r.status}`);
    console.log(text.slice(0, 500));
  }
} else {
  console.log('\n❌ refresh_token が取得できませんでした。');
  console.log('Self Client で access_type=offline を選択しているか確認してください。');
}
