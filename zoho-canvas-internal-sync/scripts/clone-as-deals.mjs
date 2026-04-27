// 既存の Leads DetailView Canvas テンプレを Deals 用にフィールドID差分注入してクローンするCLI。
//
// 使い方:
//   node scripts/clone-as-deals.mjs <leads_canvas.json> --name "<新名>" \
//     [--module Deals] [--layout Standard] [--target-org <ORG_ID>] \
//     [--drop-relatedlist] [--drop-action] [--dry-run]
//
// 動作:
//   1. 元JSONをロード（BOM除去）
//   2. server-generated メタを再帰削除（id / componentid / created_*等）
//   3. ターゲットOrgの 元モジュール / 指定モジュールの fields を取得
//   4. テンプレ内の field id を「元モジュールでのid → api_name → 指定モジュールのid」で差し替え
//      不在なら field ノードを drop
//   5. relatedlist は元モジュール固有なので既定で drop（--drop-relatedlist=false で残す）
//   6. action ノードはモジュール非依存のシステムボタンが多いが既定は残し、--drop-action で除去
//   7. module / layout を指定モジュール側に差し替え、name=<新名>, action='create'
//   8. POST → 201

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  const dx = await import('@dotenvx/dotenvx');
  const cfg = dx.config || dx.default?.config;
  cfg?.({ path: ['.env', '../.env'], quiet: true, overload: false });
} catch { /* fallback to process.env */ }

import { getToken, getModules, getLayouts, getFields, getRelatedLists, canvas } from './lib/oauth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

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
  console.error('usage: node scripts/clone-as-deals.mjs <leads_canvas.json> --name "<new_name>" [--module Deals] [--layout Standard] [--target-org <id>] [--drop-relatedlist] [--drop-action] [--dry-run]');
  process.exit(1);
}

const dropAction = args.flags['drop-action'] === true || args.flags['drop-action'] === 'true';

// 1. ロード
let raw = await readFile(resolve(file), 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const src = JSON.parse(raw);
const view = src.canvas_view?.[0];
if (!view) throw new Error('no canvas_view[0]');

const SRC_MODULE_API = view.module?.api_name || 'Leads';
const SRC_LAYOUT_NAME = view.layout?.name;
console.log(`source: feature=${view.feature}, module=${SRC_MODULE_API}, layout=${SRC_LAYOUT_NAME || '(none)'}`);

// 2. メタ削除
const STRIP_TOP = ['id', 'created_time', 'modified_time', 'created_by', 'modified_by', 'is_default', 'state', 'source', 'type', 'generated_type', 'share', 'profiles'];
for (const k of STRIP_TOP) delete view[k];
function stripNode(n) {
  if (!n || typeof n !== 'object') return;
  delete n.componentid;
  delete n.uniqueid;
  if (Array.isArray(n.children)) for (const c of n.children) stripNode(c);
}
if (Array.isArray(view.children)) for (const c of view.children) stripNode(c);

view.name = newName;
view.action = 'create';
view.related_to = view.related_to || { data_hub_associations: null, lookup_associations: null, homepage_associations: [] };

// 3. ターゲット情報
const orgId = args.flags['target-org'] || process.env.ZOHO_ORG_ID;
const targetModuleApi = args.flags.module || 'Deals';
const targetLayoutName = args.flags.layout || 'Standard';

const token = await getToken({ orgId });
console.log(`oauth token: OK  (target ORG=${orgId})`);

const modules = await getModules(token);
const targetMod = modules.find(m => m.api_name === targetModuleApi);
if (!targetMod) {
  console.error(`target module not found: ${targetModuleApi}`);
  process.exit(1);
}
console.log(`remap module: ${view.module?.id} → ${targetMod.id} (${targetMod.api_name})`);
view.module = { id: targetMod.id, api_name: targetMod.api_name };

if (view.layout || ['DetailView', 'ListView', 'CreatePage', 'EditPage'].includes(view.feature)) {
  const layouts = await getLayouts(token, targetMod.api_name);
  const layout = layouts.find(l => l.name === targetLayoutName) || layouts[0];
  if (!layout) {
    console.error(`no layout in target org for module=${targetMod.api_name}`);
    process.exit(1);
  }
  console.log(`remap layout: ${view.layout?.id || '(none)'} → ${layout.id} (${layout.name})`);
  view.layout = { id: layout.id, name: layout.name };
}

// 4. フィールドID差分注入
//    ソースフィールドの id はテンプレ作成元 Org のもの。
//    --source-env <SUFFIX> が指定されたら ZOHO_CLIENT_ID_<SUFFIX> 等を使ってソースOrgのトークンを取る。
const srcEnvSuffix = args.flags['source-env'];
let sourceToken = token;
let sourceOrgId = orgId;
if (srcEnvSuffix) {
  const suf = `_${srcEnvSuffix}`;
  const srcClientId = process.env[`ZOHO_CLIENT_ID${suf}`];
  const srcClientSecret = process.env[`ZOHO_CLIENT_SECRET${suf}`];
  sourceOrgId = process.env[`ZOHO_ORG_ID${suf}`];
  if (!srcClientId || !srcClientSecret || !sourceOrgId) {
    console.error(`missing source env vars: ZOHO_CLIENT_ID${suf} / ZOHO_CLIENT_SECRET${suf} / ZOHO_ORG_ID${suf}`);
    process.exit(1);
  }
  sourceToken = await getToken({ orgId: sourceOrgId, clientId: srcClientId, clientSecret: srcClientSecret });
  console.log(`source token: OK  (source ORG=${sourceOrgId}, env suffix=${srcEnvSuffix})`);
}
console.log(`fetching fields/related_lists: source=${SRC_MODULE_API}@${sourceOrgId}, target=${targetMod.api_name}@${orgId} ...`);
const [sourceFields, targetFields, sourceRLs, targetRLs] = await Promise.all([
  getFields(sourceToken, SRC_MODULE_API),
  getFields(token, targetMod.api_name),
  getRelatedLists(sourceToken, SRC_MODULE_API),
  getRelatedLists(token, targetMod.api_name),
]);
const sourceIdToApi = new Map(sourceFields.map(f => [String(f.id), f.api_name]));
const targetApiToField = new Map(targetFields.map(f => [f.api_name, f]));
const sourceRLIdToApi = new Map(sourceRLs.map(r => [String(r.id), r.api_name]));
const targetRLApiToId = new Map(targetRLs.map(r => [r.api_name, String(r.id)]));
console.log(`source fields=${sourceFields.length}, target fields=${targetFields.length}, source RLs=${sourceRLs.length}, target RLs=${targetRLs.length}`);

// モジュール非依存のシステム関連リスト（IDが文字列で固定）
const SYSTEM_RL_IDS = new Set(['upcoming_action', 'timeline', 'history', 'open_activities', 'closed_activities', 'attachments', 'notes', 'products', 'contact_roles', 'invited_meetings', 'business_messaging', 'social_interactions']);

function remapRelatedlistId(id) {
  if (!id) return null;
  if (SYSTEM_RL_IDS.has(id)) return id;
  if (!/^\d+$/.test(id)) return id;
  const apiName = sourceRLIdToApi.get(String(id));
  if (!apiName) return null;
  return targetRLApiToId.get(apiName) || null;
}

function isListComponent(n) {
  const cls = n?.ui?.value?.class;
  return typeof cls === 'string' && cls.includes('zc-list-component');
}

function findRelatedlist(n) {
  if (!n || typeof n !== 'object') return null;
  if (n.type === 'relatedlist') return n;
  if (Array.isArray(n.children)) {
    for (const c of n.children) {
      const r = findRelatedlist(c);
      if (r) return r;
    }
  }
  return null;
}

const stats = { fieldMapped: 0, fieldDropped: 0, listCompKept: 0, listCompDropped: 0, actDropped: 0 };
const unmapped = new Set();
const unmappedRL = new Set();

function processChildren(arr) {
  if (!Array.isArray(arr)) return;
  for (let i = arr.length - 1; i >= 0; i--) {
    const n = arr[i];
    if (!n || typeof n !== 'object') continue;

    // list-component（関連リストの「枠」）単位で remap or drop。
    // タイトルだけ残ると Zoho が読み込み中スピナーを永久に出すため、丸ごと処理する。
    if (isListComponent(n)) {
      const rl = findRelatedlist(n);
      if (!rl) {
        // 中身が無い枠は破損 → drop
        arr.splice(i, 1);
        stats.listCompDropped += 1;
        continue;
      }
      const newId = remapRelatedlistId(String(rl.id));
      if (!newId) {
        unmappedRL.add(sourceRLIdToApi.get(String(rl.id)) || `id:${rl.id}`);
        arr.splice(i, 1);
        stats.listCompDropped += 1;
        continue;
      }
      if (newId !== rl.id) rl.id = newId;
      // relatedlist 内の field 子ノードは参照モジュールが Deals 以外（Quotes/Cadences等）になり
      // Leads field id では正しく動作しない。children=[] にして Zoho のデフォルト列に任せる。
      rl.children = [];
      // ついでに list-component 配下の moreRLActions ボタン id を新 RL id に同期
      if (Array.isArray(n.children)) syncRLActionIds(n.children, newId);
      stats.listCompKept += 1;
      // list-component 内部はもう触らない（field処理は子の relatedlist を空にした時点で完了）
      continue;
    }

    if (n.type === 'field' && typeof n.id === 'string' && /^\d+$/.test(n.id)) {
      const apiName = sourceIdToApi.get(n.id);
      const target = apiName ? targetApiToField.get(apiName) : null;
      if (target) {
        n.id = String(target.id);
        if (target.data_type) {
          n.datatype = target.data_type === 'ownerlookup' ? 'lookup' : target.data_type;
        }
        stats.fieldMapped += 1;
      } else {
        unmapped.add(apiName || `id:${n.id}`);
        arr.splice(i, 1);
        stats.fieldDropped += 1;
        continue;
      }
    } else if (n.type === 'action' && dropAction) {
      arr.splice(i, 1);
      stats.actDropped += 1;
      continue;
    }

    if (Array.isArray(n.children)) processChildren(n.children);
  }
}

function syncRLActionIds(arr, newRLId) {
  if (!Array.isArray(arr)) return;
  for (const n of arr) {
    if (!n || typeof n !== 'object') continue;
    if (typeof n.id === 'string' && n.id.startsWith('moreRLActions')) {
      n.id = `moreRLActions${newRLId}`;
    }
    if (Array.isArray(n.children)) syncRLActionIds(n.children, newRLId);
  }
}

processChildren(view.children);

// 空タブを刈る：list-comp drop の結果、relatedlist も section も実 field も無くなったタブ（Tab Layout 配下）を削除する。
// 「すべての項目」タブ（zc-tab-all-fields）は section があるので残る。
// Overview タブ等で実コンテンツが残っていれば残す。
function tabHasContent(n) {
  if (!n || typeof n !== 'object') return false;
  if (n.type === 'relatedlist') return true;
  if (n.type === 'section') return true;
  if (n.type === 'field' && n.id && n.id !== 'commonfield') return true;
  if (Array.isArray(n.children)) {
    for (const c of n.children) if (tabHasContent(c)) return true;
  }
  return false;
}
function pruneEmptyTabs(node) {
  if (!node || typeof node !== 'object') return 0;
  let removed = 0;
  if (node.theme === 'Tab Layout' && Array.isArray(node.children)) {
    const before = node.children.length;
    node.children = node.children.filter((tab) => tabHasContent(tab));
    removed += before - node.children.length;
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) removed += pruneEmptyTabs(c);
  }
  return removed;
}
const tabsRemoved = pruneEmptyTabs(view);
stats.tabsDropped = tabsRemoved;

console.log(`mapping: field mapped=${stats.fieldMapped}, fieldDropped=${stats.fieldDropped}, listComp kept=${stats.listCompKept}, listComp dropped=${stats.listCompDropped}, tabs dropped=${stats.tabsDropped}, action dropped=${stats.actDropped}`);
if (unmapped.size) {
  const list = [...unmapped];
  console.log(`unmapped fields (dropped): ${list.slice(0, 20).join(', ')}${list.length > 20 ? ` ...(+${list.length - 20})` : ''}`);
}
if (unmappedRL.size) {
  console.log(`unmapped relatedlists (list-comp dropped): ${[...unmappedRL].join(', ')}`);
}

const payload = { canvas_view: [view] };

// 5. dry-run / POST
if (args.flags['dry-run']) {
  const out = resolve(repoRoot, '_generated', `clone-as-${targetModuleApi}__${Date.now()}.json`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(payload, null, 2));
  console.log(`\n[DRY-RUN] payload saved: ${out}`);
  process.exit(0);
}

console.log(`\nPOST as "${newName}" → ${targetModuleApi}/${targetLayoutName} ...`);
const res = await canvas.create(token, payload);
console.log(`POST status=${res.status}`);
console.log(res.text.slice(0, 600));

const newId = res.json?.canvas_view?.[0]?.details?.id;
if (newId) console.log(`\n✅ created: id=${newId}`);
else process.exit(1);
