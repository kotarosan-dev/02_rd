// pnpm exec <name> [<sample_entity_id>]
//   リモートを変更せず、現在のリモートのスクリプトをそのまま実行（save しない）
//   → 実装上は editpage で取得した script をそのまま PUT(is_execute:true) で投げる
import { findByName, readFunction } from '../client/fileLayout.mjs';
import { getCustomFunction, updateCustomFunction, getSampleEntityId, assertProdWriteAllowed } from '../client/booksClient.mjs';

const name = process.argv[2];
const sampleArg = process.argv[3];
if (!name) { console.error('Usage: pnpm exec <name> [<sample_entity_id>]'); process.exit(1); }

const found = findByName(name);
if (!found) { console.error(`Not found locally: ${name}`); process.exit(1); }

assertProdWriteAllowed('exec');

const { meta } = readFunction(found.entity, name);
const detail = await getCustomFunction({ id: meta.customfunction_id, entity: meta.entity });
const remoteScript = (detail.customfunction || detail).script || '';

const sampleEntityId = sampleArg || await getSampleEntityId(meta.entity);
if (!sampleEntityId) { console.error('sample entity が見つかりません'); process.exit(1); }

const r = await updateCustomFunction({
  id: meta.customfunction_id,
  name: meta.function_name,
  entity: meta.entity,
  script: remoteScript,
  description: meta.description ?? '',
  execute: true,
  sampleEntityId,
});
const logs = r.execution_response?.log_message || [];
console.log(logs.length ? logs.join('\n') : '(no info output)');
