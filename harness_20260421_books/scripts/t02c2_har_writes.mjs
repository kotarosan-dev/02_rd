// T02-C2: HAR から POST/PUT/DELETE と /deluge/ パスを全部抽出（書き込み系を確実に拾う）
import fs from 'fs';
import path from 'path';

const HAR_DIR = path.resolve('../zoho-deluge-sync/docs/har');
const HARS = process.argv.slice(2).length ? process.argv.slice(2) : ['books_c_function_create.har', 'books_d_function_execute.har'];
const SKIP = /\.(js|css|woff|png|jpg|svg|gif|ico)(\?|$)/i;

function maskHeaders(headers) {
  const out = [];
  for (const h of headers) {
    const k = h.name.toLowerCase();
    if (k === 'cookie' || k === 'set-cookie' || k === 'authorization') {
      out.push([h.name, `<MASKED len=${(h.value || '').length}>`]);
    } else if (k.includes('csrf') || k.includes('zb-source') || k.includes('zb-org')) {
      out.push([h.name, `<MASKED len=${(h.value || '').length}>`]);
    } else if (h.name.startsWith(':')) {
      // skip pseudo
    } else {
      out.push([h.name, h.value]);
    }
  }
  return out;
}

for (const h of HARS) {
  const har = JSON.parse(fs.readFileSync(path.join(HAR_DIR, h), 'utf8'));
  console.log(`\n========== ${h} ==========`);
  const writes = [];
  const deluges = [];
  for (const e of (har.log?.entries || [])) {
    const url = e.request.url;
    if (SKIP.test(url)) continue;
    const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(e.request.method);
    const isDeluge = /\/deluge\//i.test(url) || /\/api\/v3\/.*function/i.test(url) || /\/api\/v3\/.*script/i.test(url);
    if (isWrite || isDeluge) {
      const item = {
        method: e.request.method,
        url,
        status: e.response.status,
        mime: e.response.content?.mimeType,
        headers: maskHeaders(e.request.headers),
        reqBody: e.request.postData?.text || null,
        resBody: e.response.content?.text || null,
      };
      if (isWrite) writes.push(item); else deluges.push(item);
    }
  }
  console.log(`-- writes (${writes.length}) --`);
  for (const w of writes) {
    console.log(`\n  ${w.method} ${w.status}  ${w.url}`);
    for (const [k, v] of w.headers) {
      if (/^(content-type|x-zcsrf|x-requested-with|referer|x-zb-|origin|x-zoho)/i.test(k)) {
        console.log(`    ${k}: ${typeof v === 'string' ? v.slice(0, 200) : v}`);
      }
    }
    if (w.reqBody) console.log(`    REQ: ${w.reqBody.slice(0, 800).replace(/\s+/g, ' ')}`);
    if (w.resBody) console.log(`    RES: ${w.resBody.slice(0, 600).replace(/\s+/g, ' ')}`);
  }
  console.log(`\n-- deluge GETs (${deluges.length}) --`);
  for (const d of deluges) {
    console.log(`\n  ${d.method} ${d.status}  ${d.url}`);
    if (d.resBody) console.log(`    RES: ${d.resBody.slice(0, 400).replace(/\s+/g, ' ')}`);
  }
}
