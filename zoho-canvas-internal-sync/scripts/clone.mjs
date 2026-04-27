// Pull した Canvas JSON を別名で POST してクローンする。
// componentid / id / 各種 created/modified メタを削除して action:create に整形。
// 内部API（Cookie+CSRF）経由。

import { readFile } from 'node:fs/promises';
import { api } from './lib/client.mjs';

const file = process.argv[2];
const newName = process.argv[3];
if (!file || !newName) {
  console.error('usage: node scripts/clone.mjs <pulled_canvas.json> <new_name>');
  process.exit(1);
}

let raw = await readFile(file, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const src = JSON.parse(raw);
const view = src.canvas_view?.[0];
if (!view) throw new Error('no canvas_view[0]');

// メタ削除（再採番されるべきフィールド）
const stripKeys = ['id', 'created_time', 'modified_time', 'created_by', 'modified_by', 'is_default', 'state', 'source', 'type', 'generated_type', 'share', 'profiles'];
function stripNode(n) {
  if (!n || typeof n !== 'object') return;
  delete n.componentid;
  if (Array.isArray(n.children)) for (const c of n.children) stripNode(c);
}
for (const k of stripKeys) delete view[k];
view.name = newName;
view.action = 'create';
if (Array.isArray(view.children)) for (const c of view.children) stripNode(c);
// related_to が null だと拒否される場合に備えてデフォルト
view.related_to = view.related_to || { data_hub_associations: null, lookup_associations: null, homepage_associations: [] };

const payload = { canvas_view: [view] };
const res = await api.createView(payload);
console.log(`status=${res.status}`);
console.log(res.text.slice(0, 500));
if (res.status >= 400) process.exit(1);
