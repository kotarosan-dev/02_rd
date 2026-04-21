// T01-A0: Books OAuth 疎通 + /organizations で正しい org_id を実証
// CRM org_id と Books org_id 候補の両方で soid を組んでトークンを取り、
// それぞれで /organizations を叩いて何が見えるかを比較する。
import { getBooksToken, booksGet, BOOKS_BASE, ACCOUNTS_URL, TLD } from './_lib.mjs';

const ORG_CANDIDATES = [
  { label: 'CRM_ORG_ID',       value: '90000792316' },
  { label: 'BOOKS_ORG_CAND',   value: '90000792806' },
];

console.log('=== T01-A0: Books OAuth probe ===');
console.log('ACCOUNTS_URL =', ACCOUNTS_URL);
console.log('BOOKS_BASE   =', BOOKS_BASE);
console.log('TLD          =', TLD);
console.log('');

const results = [];

for (const cand of ORG_CANDIDATES) {
  console.log(`--- soid=ZohoBooks.${cand.value}  (${cand.label}) ---`);
  let token = null;
  try {
    token = await getBooksToken(cand.value);
    console.log(`  token OK (len=${token.length})`);
  } catch (e) {
    console.log(`  token FAIL: ${e.message}`);
    results.push({ ...cand, token_ok: false, error: e.message });
    continue;
  }

  // /organizations は organization_id 不要
  const r = await booksGet('/organizations', { token });
  console.log(`  GET /organizations -> HTTP ${r.status}, code=${r.json?.code}, msg=${r.json?.message ?? ''}`);
  if (r.json?.organizations) {
    for (const o of r.json.organizations) {
      console.log(`    - org_id=${o.organization_id} name="${o.name}" plan=${o.plan_type ?? '-'} currency=${o.currency_code} dc=${o.zoho_books_url ?? '-'}`);
    }
    results.push({ ...cand, token_ok: true, http: r.status, orgs: r.json.organizations.map(o => ({ id: o.organization_id, name: o.name, currency: o.currency_code })) });
  } else {
    console.log(`  raw: ${r.raw}`);
    results.push({ ...cand, token_ok: true, http: r.status, code: r.json?.code, msg: r.json?.message, raw: r.raw });
  }
  console.log('');
}

console.log('=== summary ===');
console.log(JSON.stringify(results, null, 2));

const anyOrgVisible = results.some(r => r.orgs && r.orgs.length > 0);
if (!anyOrgVisible) {
  console.log('\n[FAIL] どの soid 候補でも Books の組織一覧が見えなかった。Self Client に ZohoBooks スコープが付与されているか、Books が有効化されているかを確認すること。');
  process.exit(1);
}
console.log('\n[PASS] 少なくとも 1 つの候補で /organizations が取得できた。↑ の org_id を T01-A で確定する。');
