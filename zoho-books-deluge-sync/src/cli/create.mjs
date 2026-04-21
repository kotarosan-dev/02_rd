// pnpm create <name> --entity <entity> [--from <local-template.dg>]
//   新規 Custom Function をリモートに作成し、ローカル deluge/<entity>/<name>.dg にも書き出す
import fs from 'fs';
import { createCustomFunction, assertProdWriteAllowed } from '../client/booksClient.mjs';
import { writeFunction } from '../client/fileLayout.mjs';

const args = process.argv.slice(2);
const name = args[0];
const entityIdx = args.indexOf('--entity');
const entity = entityIdx > -1 ? args[entityIdx + 1] : null;
const fromIdx = args.indexOf('--from');
const fromFile = fromIdx > -1 ? args[fromIdx + 1] : null;

if (!name || !entity) {
  console.error('Usage: pnpm create <name> --entity <invoice|estimate|bill|...> [--from <template.dg>]');
  process.exit(1);
}

assertProdWriteAllowed('create');

const script = fromFile
  ? fs.readFileSync(fromFile, 'utf8')
  : `// ${name} (${entity}) - created by zoho-books-deluge-sync\ninfo "Hello from ${name}";\nreturn;\n`;

const r = await createCustomFunction({ name, entity, script });
const cf = r.customfunction;
console.log(`✅ created: id=${cf.customfunction_id}  name=${cf.function_name}`);

writeFunction({
  entity,
  name: cf.function_name,
  script,
  meta: {
    customfunction_id: cf.customfunction_id,
    function_name: cf.function_name,
    entity,
    placeholder: cf.placeholder,
    language: 'deluge',
    return_type: cf.return_type ?? 'void',
    description: '',
    pulled_at: new Date().toISOString(),
    created_by_tool: true,
  },
});
console.log(`✅ wrote local copy: deluge/${entity}/${cf.function_name}.dg`);
