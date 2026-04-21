// T02-C3: HAR 内の全ドメイン × method を集計
import fs from 'fs';
import path from 'path';

const HAR_DIR = path.resolve('../zoho-deluge-sync/docs/har');
const HARS = ['books_a_workflow.har', 'books_b_function_open_save.har', 'books_c_function_create.har'];
const SKIP = /\.(js|css|woff|png|jpg|svg|gif|ico|html)(\?|$)/i;

for (const h of HARS) {
  const har = JSON.parse(fs.readFileSync(path.join(HAR_DIR, h), 'utf8'));
  console.log(`\n========== ${h} (total entries: ${har.log?.entries?.length}) ==========`);
  const tally = new Map();
  const writes = [];
  for (const e of (har.log?.entries || [])) {
    const u = new URL(e.request.url);
    const key = `${e.request.method} ${u.host}${u.pathname.split('/').slice(0, 4).join('/')}`;
    tally.set(key, (tally.get(key) || 0) + 1);
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(e.request.method) && !SKIP.test(e.request.url)) {
      writes.push(e);
    }
  }
  // sort tally
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sorted) console.log(`  ${String(v).padStart(3)}  ${k}`);

  console.log(`\n  >>> ALL WRITE REQUESTS (${writes.length}) <<<`);
  for (const w of writes) {
    console.log(`\n  ${w.request.method} ${w.response.status}  ${w.request.url}`);
    if (w.request.postData?.text) {
      console.log(`    REQ BODY (${w.request.postData.mimeType}): ${w.request.postData.text.slice(0, 800).replace(/\s+/g, ' ')}`);
    }
    if (w.response.content?.text) {
      console.log(`    RES BODY: ${w.response.content.text.slice(0, 500).replace(/\s+/g, ' ')}`);
    }
  }
}
