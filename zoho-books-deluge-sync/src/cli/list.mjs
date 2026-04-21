// pnpm list — Custom Function 一覧
import { listCustomFunctions } from '../client/booksClient.mjs';

const fns = await listCustomFunctions();
console.log(`# ${fns.length} functions\n`);
console.log('ID                  ENTITY        ACTIVE  NAME');
console.log('------------------- ------------- ------  ----------------------------');
for (const f of fns) {
  console.log(
    `${String(f.customfunction_id).padEnd(20)}${String(f.entity).padEnd(14)}${f.is_active ? '  yes ' : '  no  '} ${f.function_name}`
  );
}
