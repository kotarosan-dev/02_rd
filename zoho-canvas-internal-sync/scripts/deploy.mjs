// Canvas クロスOrgデプロイCLI（公式OAuth Bearer 経由）。
//
// 使い方:
//   node scripts/deploy.mjs <pulled_canvas.json> --name "<新名>" \
//     [--target-org <ORG_ID>] [--module <api_name>] [--layout <name>] \
//     [--dry-run] [--keep-id]
//
// 既定:
//   --target-org : .env の ZOHO_ORG_ID
//   --module     : 元JSONの module.api_name
//   --layout     : 元JSONの layout.name（無ければ Standard、それも無ければ先頭）
//
// 動作:
//   1. 元JSONをロード（BOM除去）
//   2. メタ削除 + componentid 全ノード再帰剥がし
//   3. ターゲットOrgの module.id / layout.id を取得して remap
//   4. action="create", name=<新名>, related_to を補完
//   5. POST → 201 で id を返す。--dry-run なら送信せずペイロード保存のみ

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
try {
  const dx = await import('@dotenvx/dotenvx');
  const cfg = dx.config || dx.default?.config;
  // ローカル .env（内部API用Cookie等）と親の .env（OAuth資格情報）の両方を読む
  cfg?.({ path: ['.env', '../.env'], quiet: true, overload: false });
} catch { /* dotenvx 未導入なら通常の process.env を使う */ }
import { getToken, getModules, getLayouts, canvas } from './lib/oauth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      a.flags[k] = v;
    } else a._.push(t);
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const file = args._[0];
const newName = args.flags.name;
if (!file || !newName) {
  console.error('usage: node scripts/deploy.mjs <pulled_canvas.json> --name "<new_name>" [--target-org <id>] [--module <api_name>] [--layout <name>] [--dry-run] [--keep-id]');
  process.exit(1);
}

// 1. ロード
let raw = await readFile(resolve(file), 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const src = JSON.parse(raw);
const view = src.canvas_view?.[0];
if (!view) throw new Error('no canvas_view[0]');

const SRC_MODULE_API = view.module?.api_name;
const SRC_LAYOUT_NAME = view.layout?.name;
console.log(`source: feature=${view.feature}, module=${SRC_MODULE_API}, layout=${SRC_LAYOUT_NAME || '(none)'}, children=${view.children?.length || 0}`);

// 2. メタ削除
const stripKeys = ['id', 'created_time', 'modified_time', 'created_by', 'modified_by', 'is_default', 'state', 'source', 'type', 'generated_type', 'share', 'profiles'];
if (!args.flags['keep-id']) for (const k of stripKeys) delete view[k];
function stripNode(n) {
  if (!n || typeof n !== 'object') return;
  delete n.componentid;
  if (Array.isArray(n.children)) for (const c of n.children) stripNode(c);
}
if (Array.isArray(view.children)) for (const c of view.children) stripNode(c);
view.name = newName;
view.action = 'create';
view.related_to = view.related_to || { data_hub_associations: null, lookup_associations: null, homepage_associations: [] };

// 3. ターゲット取得 → remap
const orgId = args.flags['target-org'] || process.env.ZOHO_ORG_ID;
const targetModuleApi = args.flags.module || SRC_MODULE_API;
const targetLayoutName = args.flags.layout || SRC_LAYOUT_NAME || 'Standard';

const token = await getToken({ orgId });
console.log(`oauth token: OK  (target ORG=${orgId})`);

const modules = await getModules(token);
const mod = modules.find(m => m.api_name === targetModuleApi);
if (!mod) {
  console.error(`module not found in target org: api_name=${targetModuleApi}`);
  process.exit(1);
}
console.log(`remap module: ${view.module?.id} → ${mod.id} (${mod.api_name})`);
view.module = { id: mod.id, api_name: mod.api_name };

if (view.layout || ['DetailView', 'ListView', 'CreatePage', 'EditPage'].includes(view.feature)) {
  const layouts = await getLayouts(token, mod.api_name);
  const layout = layouts.find(l => l.name === targetLayoutName) || layouts[0];
  if (!layout) {
    console.error(`no layout in target org for module=${mod.api_name}`);
    process.exit(1);
  }
  console.log(`remap layout: ${view.layout?.id || '(none)'} → ${layout.id} (${layout.name})`);
  view.layout = { id: layout.id, name: layout.name };
}

const payload = { canvas_view: [view] };

// 4. dry-run / POST
if (args.flags['dry-run']) {
  const out = resolve(__dirname, '..', `_deploy_${Date.now()}.json`);
  await writeFile(out, JSON.stringify(payload, null, 2));
  console.log(`\n[DRY-RUN] payload saved: ${out}`);
  process.exit(0);
}

console.log(`\nPOST as "${newName}" ...`);
const res = await canvas.create(token, payload);
console.log(`POST status=${res.status}`);
console.log(res.text.slice(0, 500));

const newId = res.json?.canvas_view?.[0]?.details?.id;
if (newId) console.log(`\n✅ deployed: id=${newId}`);
else process.exit(1);
