// HAR から Books の Cookie / CSRF を抽出して .env.books に書き出す
// セキュリティ: HAR 自体は .gitignore 済み。出力する .env.books も .gitignore 対象
import fs from 'fs';
import path from 'path';

const HAR = path.resolve('../zoho-deluge-sync/docs/har/books_d_function_execute.har');
const OUT = path.resolve('.env.books');

const har = JSON.parse(fs.readFileSync(HAR, 'utf8'));
const target = har.log.entries.find(e =>
  e.request.method === 'PUT' &&
  /\/api\/v3\/integrations\/customfunctions\//.test(e.request.url)
);
if (!target) {
  console.error('対象の PUT が見つかりません');
  process.exit(1);
}

const headers = Object.fromEntries(target.request.headers.map(h => [h.name.toLowerCase(), h.value]));
const cookie = headers['cookie'];
const csrf = headers['x-zcsrf-token'];
const source = headers['x-zb-source'];
const referer = headers['referer'];
const orgIdMatch = referer && referer.match(/\/app\/(\d+)/);
const orgId = orgIdMatch ? orgIdMatch[1] : '';

if (!cookie || !csrf) {
  console.error('cookie or csrf 不足');
  process.exit(1);
}

const out = `# Books 内部 API 認証情報（HAR から自動抽出）
# 取得元: ${HAR}
# 日付: ${new Date().toISOString()}
# ⚠️ 絶対に commit しない。dotenvx で暗号化するか、ローカル専用にする。

ZOHO_BOOKS_BASE_URL=https://books.zoho.jp
ZOHO_BOOKS_ORG_ID=${orgId}
ZOHO_BOOKS_CSRF_TOKEN=${csrf}
ZOHO_BOOKS_SOURCE=${source || ''}
ZOHO_BOOKS_COOKIE=${cookie}
`;

fs.writeFileSync(OUT, out);
console.log(`✅ ${OUT} に書き出しました`);
console.log(`   org_id=${orgId}, csrf_len=${csrf.length}, cookie_len=${cookie.length}`);
