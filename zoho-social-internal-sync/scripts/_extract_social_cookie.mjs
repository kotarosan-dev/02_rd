// HAR から Zoho Social の Cookie / CSRF / Portal ID / Brand ID / Channel ID を抽出して
// .env.social に書き出す。
//
// 使い方: node scripts/_extract_social_cookie.mjs <har-path>
// 既定で docs/har/social_d_post_now.har を見る（最も情報が揃っている想定）。
//
// セキュリティ: HAR 自体は .gitignore 済み。出力する .env.social も .gitignore 対象。

import fs from 'fs';
import path from 'path';

const HAR = path.resolve(process.argv[2] || 'docs/har/social_d_post_now.har');
const OUT = path.resolve('.env.social');

if (!fs.existsSync(HAR)) {
  console.error(`HAR が見つかりません: ${HAR}`);
  console.error('docs/har/ 以下に Social の HAR を配置してから再実行してください。');
  process.exit(1);
}

const har = JSON.parse(fs.readFileSync(HAR, 'utf8'));

// XHR/Fetch の中で /api/ を含むリクエストを優先
const candidates = har.log.entries.filter(e => /\/api\//.test(e.request.url));
if (candidates.length === 0) {
  console.error('対象の /api/* リクエストが HAR 内にありません');
  process.exit(1);
}

// Cookie と X-ZCSRF-TOKEN が両方ある最初のエントリ
const target = candidates.find(e => {
  const h = Object.fromEntries(e.request.headers.map(x => [x.name.toLowerCase(), x.value]));
  return h['cookie'] && (h['x-zcsrf-token'] || h['x-csrf-token']);
}) || candidates[0];

const headers = Object.fromEntries(target.request.headers.map(h => [h.name.toLowerCase(), h.value]));
const cookie = headers['cookie'];
const csrf = headers['x-zcsrf-token'] || headers['x-csrf-token'] || '';
const referer = headers['referer'] || '';

if (!cookie) {
  console.error('cookie 不足: HAR の "Include sensitive data" が ON か確認してください');
  process.exit(1);
}

// Portal / Brand / Channel ID を URL とクエリから推測
const portalMatch = (referer || target.request.url).match(/social\.zoho\.[^/]+\/(\d+)/);
const portalId = portalMatch ? portalMatch[1] : '';

let brandId = '', channelId = '';
for (const e of candidates) {
  const u = new URL(e.request.url);
  brandId = brandId || u.searchParams.get('brandId') || u.searchParams.get('brand_id') || '';
  channelId = channelId || u.searchParams.get('channelId') || u.searchParams.get('channel_id') || '';
  if (brandId && channelId) break;
}

const baseUrlMatch = (target.request.url).match(/^(https?:\/\/social\.zoho\.[^/]+)/);
const baseUrl = baseUrlMatch ? baseUrlMatch[1] : 'https://social.zoho.com';

const out = `# Zoho Social 内部 API 認証情報（HAR から自動抽出）
# 取得元: ${HAR}
# 日付: ${new Date().toISOString()}
# ⚠️ 絶対に commit しない。dotenvx で暗号化するか、ローカル専用にする。

ZOHO_SOCIAL_BASE_URL=${baseUrl}
ZOHO_SOCIAL_PORTAL_ID=${portalId}
ZOHO_SOCIAL_BRAND_ID=${brandId}
ZOHO_SOCIAL_CHANNEL_TYPE=LINKEDIN_PERSONAL
ZOHO_SOCIAL_CHANNEL_ID_LINKEDIN_PERSONAL=${channelId}
ZOHO_SOCIAL_CHANNEL_ID_LINKEDIN_COMPANY=
ZOHO_SOCIAL_CSRF_TOKEN=${csrf}
ZOHO_SOCIAL_COOKIE=${cookie}
`;

fs.writeFileSync(OUT, out);
console.log(`OK: ${OUT} に書き出しました`);
console.log(`   portal=${portalId}, brand=${brandId}, channel=${channelId}`);
console.log(`   csrf_len=${csrf.length}, cookie_len=${cookie.length}`);
if (!csrf) console.warn('  WARN: X-ZCSRF-TOKEN が空。HAR 内に書込系リクエストが含まれていない可能性あり。');
if (!brandId || !channelId) console.warn('  WARN: brandId/channelId が空。社内ブランド一覧画面 + LinkedIn 投稿画面の HAR を別途取得してください。');
