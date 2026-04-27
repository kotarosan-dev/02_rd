// Canvas JSON を解析して、コンポーネント種別・style キー・field ui_type の分布を抽出する。
// 「APIで何のデザイン要素が表現されているか」のスキーマ辞書を作るための調査ツール。

import { readFile } from 'node:fs/promises';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/analyze.mjs <canvas.json>');
  process.exit(1);
}
let raw = await readFile(file, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const json = JSON.parse(raw);
const root = json.canvas_view?.[0];
if (!root) { console.error('no canvas_view[0]'); process.exit(1); }

const types = new Map();
const classes = new Map();
const styleKeys = new Map();
const componentIds = new Set();
const fieldUiTypes = new Map();
let totalNodes = 0;
let maxDepth = 0;

function walk(n, depth = 0) {
  totalNodes++;
  maxDepth = Math.max(maxDepth, depth);
  const t = n.type || (n.id === 'view_selector' ? 'view_selector' : (n.componentid ? 'componentid_node' : 'unknown'));
  types.set(t, (types.get(t) || 0) + 1);
  if (n.componentid) componentIds.add(n.componentid);
  const cls = n.ui?.value?.class;
  if (cls) classes.set(cls, (classes.get(cls) || 0) + 1);
  const sd = n.ui?.value?.style?.default;
  if (sd && typeof sd === 'object') for (const k of Object.keys(sd)) styleKeys.set(k, (styleKeys.get(k) || 0) + 1);
  const fsd = n.ui?.field?.style?.default;
  if (fsd && typeof fsd === 'object') for (const k of Object.keys(fsd)) styleKeys.set(`field.${k}`, (styleKeys.get(`field.${k}`) || 0) + 1);
  if (n.ui_type) fieldUiTypes.set(n.ui_type, (fieldUiTypes.get(n.ui_type) || 0) + 1);
  if (Array.isArray(n.children)) for (const c of n.children) walk(c, depth + 1);
}

for (const c of root.children || []) walk(c, 1);

const top = (m, n = 30) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

console.log(`name:        ${root.name}`);
console.log(`feature:     ${root.feature}`);
console.log(`module:      ${root.module?.api_name} (${root.module?.id})`);
console.log(`layout:      ${root.layout?.name} (${root.layout?.id})`);
console.log(`top-level children: ${(root.children || []).length}`);
console.log(`total nodes: ${totalNodes}   max depth: ${maxDepth}`);
console.log(`unique componentids: ${componentIds.size}`);
console.log('');
console.log('--- node types ---');
for (const [k, v] of top(types)) console.log(`  ${v.toString().padStart(4)}  ${k}`);
console.log('');
console.log('--- CSS class on ui.value ---');
for (const [k, v] of top(classes)) console.log(`  ${v.toString().padStart(4)}  ${k}`);
console.log('');
console.log('--- style.default keys (top 30) ---');
for (const [k, v] of top(styleKeys)) console.log(`  ${v.toString().padStart(4)}  ${k}`);
console.log('');
console.log('--- ui_type ---');
for (const [k, v] of top(fieldUiTypes)) console.log(`  ${v.toString().padStart(4)}  ${k}`);
