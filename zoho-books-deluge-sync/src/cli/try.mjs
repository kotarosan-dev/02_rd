// pnpm try <name> [<sample_entity_id>]
//   ローカル .dg をリモートに反映 + その場で実行 → execution_response.log_message を表示
//   sample_entity_id 省略時は entitylist から先頭1件を自動取得
import { readFunction, findByName } from '../client/fileLayout.mjs';
import { updateCustomFunction, getSampleEntityId, assertProdWriteAllowed } from '../client/booksClient.mjs';

const name = process.argv[2];
const sampleArg = process.argv[3];
if (!name) {
  console.error('Usage: pnpm try <function_name> [<sample_entity_id>]');
  process.exit(1);
}

const found = findByName(name);
if (!found) { console.error(`Not found locally: ${name}`); process.exit(1); }

assertProdWriteAllowed('try');

const { script, meta } = readFunction(found.entity, name);
const sampleEntityId = sampleArg || await getSampleEntityId(meta.entity);
if (!sampleEntityId) {
  console.error(`サンプル ${meta.entity} が0件のため try できません。レコードを1件作成してください。`);
  process.exit(1);
}
console.log(`▶ try ${meta.entity}/${meta.function_name}  (sample=${sampleEntityId})\n`);

const r = await updateCustomFunction({
  id: meta.customfunction_id,
  name: meta.function_name,
  entity: meta.entity,
  script,
  description: meta.description ?? '',
  execute: true,
  sampleEntityId,
});

console.log(`HTTP message: ${r.message}`);
const exec = r.execution_response || {};
const logs = exec.log_message || [];

if (logs.length === 0) {
  console.log('\n(no info output)');
} else {
  console.log('\n--- info output ---');
  for (const l of logs) console.log('  ' + l);
}

// エラーらしきフィールドが返っていれば表示
for (const k of Object.keys(exec)) {
  if (/error|exception|trace|stack/i.test(k)) {
    console.log(`\n!! ${k}:`);
    console.log(typeof exec[k] === 'string' ? exec[k] : JSON.stringify(exec[k], null, 2));
  }
}
