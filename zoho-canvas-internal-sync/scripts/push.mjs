import { api } from './lib/client.mjs';
import { readFile } from 'node:fs/promises';

/**
 * Usage:
 *   node scripts/push.mjs canvases/HomeView/_payload_my_view.json            # create
 *   node scripts/push.mjs canvases/HomeView/_payload_my_view.json <viewId>   # edit
 *
 * payload JSON は POST と同じ shape:
 * { canvas_view: [{ name, ui, feature, module, children, action, related_to }] }
 *
 * 注意:
 *   - GET ?parsed=false のレスポンスをそのまま貼り付けても PUT は効かない（schema が違う）。
 *   - PUT 時は action を "edit" に書き換えて、create payload と同じ shape にする。
 */

const file = process.argv[2];
const id = process.argv[3];
if (!file) {
  console.error('usage: node scripts/push.mjs <payload.json> [viewId]');
  process.exit(1);
}

const payload = JSON.parse(await readFile(file, 'utf8'));
const action = id ? 'edit' : 'create';
if (Array.isArray(payload.canvas_view)) {
  for (const v of payload.canvas_view) v.action = action;
}

const res = id ? await api.updateView(id, payload) : await api.createView(payload);
console.log(`status=${res.status}`);
console.log(res.text);
if (res.status >= 400) process.exit(1);
