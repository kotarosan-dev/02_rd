// T01-D2: /settings/workflows と /settings/webhooks の構造を深堀り
// - workflow detail に custom_function 本体（Deluge body）が含まれるか
// - schedule / customfunction の代替パスを推測
import { getBooksToken, booksGet } from './_lib.mjs';

const BOOKS_ORG_ID = '90000792806';
const token = await getBooksToken(BOOKS_ORG_ID, 'ZohoBooks.fullaccess.all');

// 1) workflows list
console.log('=== /settings/workflows (list) ===');
const wfList = await booksGet('/settings/workflows', { token, orgId: BOOKS_ORG_ID });
console.log('HTTP', wfList.status, 'count=', wfList.json?.workflows?.length);
const workflows = wfList.json?.workflows || [];
for (const w of workflows) {
  console.log(`  - id=${w.workflow_id || w.id} name="${w.name}" type=${w.workflow_type || w.type || '-'} status=${w.status || '-'} module=${w.module || '-'}`);
}

console.log('\n=== first workflow detail (top-level keys) ===');
if (workflows.length > 0) {
  const wid = workflows[0].workflow_id || workflows[0].id;
  const wf = await booksGet(`/settings/workflows/${wid}`, { token, orgId: BOOKS_ORG_ID });
  console.log('HTTP', wf.status);
  if (wf.json?.workflow) {
    const w = wf.json.workflow;
    console.log('keys:', Object.keys(w).join(', '));
    // 重要: custom_functions / actions / scripts などのキーを探す
    if (w.custom_functions) console.log('custom_functions[]:', JSON.stringify(w.custom_functions, null, 2).slice(0, 500));
    if (w.actions)          console.log('actions[]:',          JSON.stringify(w.actions, null, 2).slice(0, 500));
    if (w.script)           console.log('script(snippet):',    w.script.slice(0, 200));
  } else {
    console.log('raw:', wf.raw);
  }
}

console.log('\n=== /settings/webhooks (list) ===');
const wh = await booksGet('/settings/webhooks', { token, orgId: BOOKS_ORG_ID });
console.log('HTTP', wh.status, 'count=', wh.json?.webhooks?.length);
console.log('top-level keys:', Object.keys(wh.json || {}).join(', '));
if (wh.json?.webhooks?.[0]) {
  console.log('first webhook keys:', Object.keys(wh.json.webhooks[0]).join(', '));
}

// 2) Schedule / Customfunction 候補をさらに探索
console.log('\n=== additional probes ===');
const more = [
  '/settings/scheduledemails',
  '/settings/scheduledpayments',
  '/settings/automation/scheduledfunctions',
  '/settings/customfunctions/global',
  '/settings/customfunctions/workflow',
  '/settings/scriptlibrary',
  '/settings/scriptlets',
  '/settings/connections',
  '/settings/customviews',
  '/settings/customfields',
  '/settings/templates',
  '/settings/emailtemplates',
];
for (const p of more) {
  const r = await booksGet(p, { token, orgId: BOOKS_ORG_ID });
  const code = r.json?.code;
  const hit = r.status === 200;
  console.log(`${hit ? '✅' : '  '} HTTP=${r.status} code=${code ?? '-'} ${p}  ${(r.json?.message || '').slice(0, 60)}`);
  if (hit) console.log(`    keys: ${Object.keys(r.json).slice(0, 8).join(', ')}`);
}
