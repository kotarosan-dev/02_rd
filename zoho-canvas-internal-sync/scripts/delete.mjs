import { api } from './lib/client.mjs';

const id = process.argv[2];
if (!id) {
  console.error('usage: node scripts/delete.mjs <viewId>');
  process.exit(1);
}
const res = await api.deleteView(id);
console.log(`status=${res.status}`);
console.log(res.text);
if (res.status >= 400) process.exit(1);
