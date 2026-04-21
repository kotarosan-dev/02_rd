// T01-D: Books の Workflow / Custom Function / Schedule 公式 API 候補プローブ
// すべて 404 / 不明なら → T02 (内部 API) 必要性を確証
import { getBooksToken, booksGet } from './_lib.mjs';

const BOOKS_ORG_ID = '90000792806';

// 公式ドキュメントに無いがあり得そうなパス候補。すべて GET で叩く。
const CANDIDATES = [
  '/settings/automation/customfunctions',
  '/settings/automation/functions',
  '/settings/automation/workflows',
  '/settings/automation/workflowrules',
  '/settings/automation/schedules',
  '/settings/automation/webhooks',
  '/settings/customfunctions',
  '/settings/functions',
  '/settings/workflows',
  '/settings/workflowrules',
  '/settings/schedules',
  '/settings/webhooks',
  '/customfunctions',
  '/functions',
  '/workflows',
  '/workflowrules',
  '/schedules',
  '/webhooks',
  '/automation/customfunctions',
  '/automation/workflows',
  '/automation/schedules',
];

const token = await getBooksToken(BOOKS_ORG_ID, 'ZohoBooks.fullaccess.all');
console.log('=== T01-D: Workflow/Function/Schedule API probe ===');
console.log(`org_id = ${BOOKS_ORG_ID}\n`);

const results = [];
for (const path of CANDIDATES) {
  const r = await booksGet(path, { token, orgId: BOOKS_ORG_ID });
  const code = r.json?.code;
  const msg = (r.json?.message || '').slice(0, 80);
  const hit = r.status === 200;
  console.log(`${hit ? '✅ HIT  ' : '   miss'} HTTP=${String(r.status).padStart(3)} code=${String(code ?? '-').padEnd(4)} ${path.padEnd(45)} ${msg}`);
  results.push({ path, http: r.status, code, msg, hit });
  if (hit) {
    console.log(`         ↳ keys: ${Object.keys(r.json).slice(0, 8).join(', ')}`);
  }
}

const hits = results.filter(r => r.hit);
console.log(`\n=== summary: ${hits.length} hit / ${results.length} probed ===`);

if (hits.length === 0) {
  console.log('\n[CONFIRMED] Books の Workflow / Custom Function / Schedule は公式 OAuth API で CRUD できない。');
  console.log('              → T02 (内部 API + Cookie 認証) が必要。');
} else {
  console.log('\n[FOUND] 公式 API でアクセス可能なエンドポイントあり。詳細仕様を docs に記録すること:');
  for (const h of hits) console.log(`  - ${h.path}`);
}
