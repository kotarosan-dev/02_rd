// T02-E: Books Custom Function フルサイクル PoC
// create → editpage(get) → update(save only) → execute(is_execute:true) → delete
// すべてのステップのレスポンス構造を artifacts/cf-smoke.json に記録する
import fs from 'fs';
import { bGet, bPost, bPut, bDelete, ORG_ID } from './_books_lib.mjs';

const NAME = '_qa_books_smoke_' + Date.now().toString(36);
const ENTITY = 'invoice';
const SCRIPT = `// PoC by zoho-deluge-sync (Books) — auto-generated\ninvoiceID = invoice.get("invoice_id");\ninfo "PoC OK invoiceID=" + invoiceID;\nreturn;\n`;

const trace = [];
const log = (label, r) => {
  console.log(`\n--- ${label} (HTTP ${r.status}) ---`);
  trace.push({ label, status: r.status, body: r.body, text_preview: r.text?.slice(0, 1500) });
  if (r.body) console.log(JSON.stringify(r.body, null, 2).slice(0, 1500));
  else console.log(r.text.slice(0, 800));
};

let createdId = null;
try {
  // 1. CREATE
  const created = await bPost('/api/v3/integrations/customfunctions', {
    function_name: NAME,
    description: 'PoC by harness_20260421_books',
    entity: ENTITY,
    language: 'deluge',
    script: SCRIPT,
    include_orgvariables_params: false,
    return_type: 'void',
  });
  log('CREATE', created);
  createdId = created.body?.customfunction?.customfunction_id
    || created.body?.customfunction?.function_id
    || created.body?.customfunction_id
    || created.body?.function_id;
  console.log('captured id:', createdId);
  if (!createdId) throw new Error('id を取得できず — レスポンス構造を要確認');

  // 2. GET (editpage)
  const got = await bGet(`/api/v3/integrations/customfunctions/editpage?customfunction_id=${createdId}&entity=${ENTITY}`);
  log('GET editpage', got);

  // 3. UPDATE (save only)
  const updated = await bPut(`/api/v3/integrations/customfunctions/${createdId}`, {
    function_name: NAME.replace(/^_/, ''),
    description: 'PoC updated',
    entity: ENTITY,
    language: 'deluge',
    script: SCRIPT + '\n// updated\n',
    is_execute: false,
    include_orgvariables_params: false,
    return_type: 'void',
  });
  log('UPDATE (save only)', updated);

  // 4. entity サンプル ID 取得
  const ents = await bGet(`/api/v3/entitylist?entity=${ENTITY}&page=1&per_page=5`);
  log('entitylist', ents);
  const sampleRow = ents.body?.data?.[0] || ents.body?.entitylist?.[0] || ents.body?.entities?.[0];
  const sampleEntityId = sampleRow && (sampleRow[`${ENTITY}_id`] || sampleRow.entity_id || sampleRow.id);
  console.log('sampleEntityId:', sampleEntityId);

  // 5. EXECUTE (is_execute:true) — sample があれば実行も試す
  if (sampleEntityId) {
    const exec = await bPut(`/api/v3/integrations/customfunctions/${createdId}`, {
      function_name: NAME.replace(/^_/, ''),
      description: 'PoC updated',
      entity: ENTITY,
      language: 'deluge',
      script: SCRIPT,
      is_execute: true,
      sample_param: { entity_id: sampleEntityId },
      include_orgvariables_params: false,
      return_type: 'void',
    });
    log('EXECUTE (is_execute:true)', exec);
  } else {
    console.log('\n[skip] サンプル entity がないため execute スキップ');
  }

  // 6. LOGS 候補パスを順に試行
  const logCandidates = [
    `/api/v3/integrations/customfunctions/${createdId}/logs`,
    `/api/v3/integrations/customfunctions/${createdId}/executionhistory`,
    `/api/v3/integrations/customfunctions/${createdId}/history`,
    `/api/v3/integrations/customfunctions/logs?customfunction_id=${createdId}`,
  ];
  for (const p of logCandidates) {
    const r = await bGet(p);
    log('LOGS try ' + p, r);
    if (r.ok) break;
  }
} finally {
  // 7. DELETE（finally で必ず掃除）
  if (createdId) {
    const del = await bDelete(`/api/v3/integrations/customfunctions/${createdId}`);
    log('DELETE', del);
  }
  fs.writeFileSync('artifacts/cf-smoke.json', JSON.stringify(trace, null, 2));
  console.log('\n→ artifacts/cf-smoke.json にトレース保存');
}
