// pnpm push <name> — ローカル .dg をリモートに反映（save only / execute なし）
import { readFunction, findByName } from '../client/fileLayout.mjs';
import { updateCustomFunction, assertProdWriteAllowed } from '../client/booksClient.mjs';

const name = process.argv[2];
if (!name) {
  console.error('Usage: pnpm push <function_name>');
  process.exit(1);
}

const found = findByName(name);
if (!found) { console.error(`Not found locally: ${name}`); process.exit(1); }

assertProdWriteAllowed('push');

const { script, meta } = readFunction(found.entity, name);
const r = await updateCustomFunction({
  id: meta.customfunction_id,
  name: meta.function_name,
  entity: meta.entity,
  script,
  description: meta.description ?? '',
  execute: false,
});
console.log(`✅ ${r.message}  (${meta.entity}/${meta.function_name})`);
