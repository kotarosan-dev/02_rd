// pnpm delete <name> --confirm
//   リモートとローカル両方から削除（--confirm なしだと dry-run）
import fs from 'fs';
import { findByName, readFunction } from '../client/fileLayout.mjs';
import { deleteCustomFunction, assertProdWriteAllowed } from '../client/booksClient.mjs';

const name = process.argv[2];
const confirm = process.argv.includes('--confirm');
if (!name) { console.error('Usage: pnpm delete <name> --confirm'); process.exit(1); }

const found = findByName(name);
if (!found) { console.error(`Not found locally: ${name}`); process.exit(1); }

const { meta, paths } = readFunction(found.entity, name);
console.log(`target: id=${meta.customfunction_id}  ${meta.entity}/${meta.function_name}`);

if (!confirm) {
  console.log('\n(dry-run) --confirm を付けると実際に削除します');
  process.exit(0);
}

assertProdWriteAllowed('delete');

const r = await deleteCustomFunction(meta.customfunction_id);
console.log(`✅ remote: ${r.message}`);
fs.unlinkSync(paths.dg);
fs.unlinkSync(paths.meta);
console.log(`✅ local removed: ${paths.dg}, ${paths.meta}`);
