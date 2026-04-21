// T02-C4: HAR の全リクエストを host/method 別に出力（フィルタなし）
import fs from 'fs';
import path from 'path';

const HAR_DIR = path.resolve('../zoho-deluge-sync/docs/har');
const HARS = ['books_a_workflow.har', 'books_b_function_open_save.har', 'books_c_function_create.har'];

for (const h of HARS) {
  const har = JSON.parse(fs.readFileSync(path.join(HAR_DIR, h), 'utf8'));
  const entries = har.log?.entries || [];
  console.log(`\n========== ${h} (entries=${entries.length}, size=${(fs.statSync(path.join(HAR_DIR, h)).size / 1024).toFixed(1)}KB) ==========`);
  const hostTally = new Map();
  for (const e of entries) {
    const u = new URL(e.request.url);
    hostTally.set(u.host, (hostTally.get(u.host) || 0) + 1);
  }
  console.log('-- hosts --');
  for (const [host, n] of [...hostTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)} ${host}`);
  }
  console.log('-- ALL entries (method, status, host, path) --');
  for (const e of entries) {
    const u = new URL(e.request.url);
    console.log(`  ${e.request.method.padEnd(6)} ${String(e.response.status).padStart(3)}  ${u.host}${u.pathname}`);
  }
}
