// T02-C: HAR から Books 内部 API 関連の XHR を抽出してマトリクス化
// 抽出対象: workflow / function / customfunction / script / automation を含む URL
import fs from 'fs';
import path from 'path';

const HAR_DIR = path.resolve('../zoho-deluge-sync/docs/har');
const HARS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['books_a_workflow.har', 'books_b_function_open_save.har', 'books_c_function_create.har'];

const KEYWORDS = /workflow|function|customfunction|script|automation|deluge|webhook|schedule/i;
const SKIP = /\.(js|css|woff|png|jpg|svg|gif|ico)(\?|$)/i;

function maskHeaders(headers) {
  const out = {};
  for (const h of headers) {
    const k = h.name.toLowerCase();
    if (k === 'cookie' || k === 'set-cookie' || k === 'authorization') {
      out[h.name] = `<MASKED len=${(h.value || '').length}>`;
    } else if (k.includes('csrf') || k.includes('token') || k === 'x-zb-source-token') {
      out[h.name] = `<MASKED len=${(h.value || '').length}>`;
    } else {
      out[h.name] = h.value;
    }
  }
  return out;
}

function summarize(harPath) {
  const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
  const entries = har.log?.entries || [];
  const hits = [];
  for (const e of entries) {
    const url = e.request.url;
    if (SKIP.test(url)) continue;
    if (!KEYWORDS.test(url)) continue;
    hits.push({
      method: e.request.method,
      url,
      status: e.response.status,
      mime: e.response.content?.mimeType,
      reqHeaders: maskHeaders(e.request.headers),
      reqBody: e.request.postData?.text?.slice(0, 1500) || null,
      resBody: e.response.content?.text?.slice(0, 1200) || null,
    });
  }
  return hits;
}

const all = {};
for (const h of HARS) {
  const p = path.join(HAR_DIR, h);
  if (!fs.existsSync(p)) {
    console.log(`!! missing: ${p}`);
    continue;
  }
  const hits = summarize(p);
  all[h] = hits;
  console.log(`\n========== ${h} (${hits.length} hits) ==========`);
  for (const hit of hits) {
    console.log(`\n  ${hit.method} ${hit.status}  ${hit.url}`);
    const interesting = ['Content-Type', 'X-ZCSRF-TOKEN', 'X-ZB-CSRF-TOKEN', 'X-CRM-ORG', 'X-ZB-Source-Token', 'X-Requested-With', 'Referer', 'X-Zb-Org-Id', 'Z-Zb-Org-Id'];
    for (const k of interesting) {
      const v = Object.entries(hit.reqHeaders).find(([n]) => n.toLowerCase() === k.toLowerCase());
      if (v) console.log(`    ${v[0]}: ${v[1]}`);
    }
    if (hit.reqBody) console.log(`    REQ BODY: ${hit.reqBody.slice(0, 400).replace(/\n/g, ' ')}`);
    if (hit.resBody) console.log(`    RES BODY: ${hit.resBody.slice(0, 400).replace(/\n/g, ' ')}`);
  }
}

const outFile = 'artifacts/har-extract.json';
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(all, null, 2));
console.log(`\n\nFull dump (with masked secrets) written to ${outFile}`);
