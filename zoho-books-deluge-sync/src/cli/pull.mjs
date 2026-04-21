// pnpm pull — リモート全関数を deluge/<entity>/<name>.dg に書き出し
import { listCustomFunctions, getCustomFunction } from '../client/booksClient.mjs';
import { writeFunction, pathFor } from '../client/fileLayout.mjs';

const list = await listCustomFunctions();
console.log(`pulling ${list.length} functions...\n`);

let ok = 0, ng = 0;
for (const meta of list) {
  try {
    const detail = await getCustomFunction({ id: meta.customfunction_id, entity: meta.entity });
    // editpage レスポンスは {customfunction:{...}} の形
    const cf = detail.customfunction || detail;
    const script = cf.script ?? '';
    const m = {
      customfunction_id: meta.customfunction_id,
      function_name: meta.function_name,
      entity: meta.entity,
      entity_formatted: meta.entity_formatted,
      placeholder: meta.placeholder,
      language: meta.language,
      return_type: cf.return_type ?? 'void',
      description: cf.description ?? meta.description ?? '',
      is_active: meta.is_active,
      created_time: meta.created_time,
      pulled_at: new Date().toISOString(),
    };
    writeFunction({ entity: meta.entity, name: meta.function_name, script, meta: m });
    const p = pathFor(meta.entity, meta.function_name);
    console.log(`  ✓ ${p.dg}`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${meta.function_name}: ${e.message}`);
    ng++;
  }
}
console.log(`\n${ok} pulled, ${ng} failed`);
