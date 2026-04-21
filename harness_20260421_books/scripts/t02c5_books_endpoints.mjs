// T02-C5: Books 関連 XHR だけに絞って整理（csplog/logsapi/xhr 除外）
import fs from 'fs';
import path from 'path';

const HAR_DIR = path.resolve('../zoho-deluge-sync/docs/har');
const HARS = process.argv.slice(2).length ? process.argv.slice(2) : ['books_c_function_create.har', 'books_d_function_execute.har'];

function decodeForm(s) {
  const out = {};
  for (const pair of s.split('&')) {
    const [k, v = ''] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

for (const h of HARS) {
  const har = JSON.parse(fs.readFileSync(path.join(HAR_DIR, h), 'utf8'));
  const entries = har.log?.entries || [];
  console.log(`\n========== ${h} (entries=${entries.length}) ==========`);

  for (const e of entries) {
    const url = e.request.url;
    if (!/books\.zoho\.jp\/(api\/v3|deluge)/i.test(url)) continue;
    const method = e.request.method;
    const status = e.response.status;
    const u = new URL(url);

    console.log(`\n  ${method} ${status}  ${u.pathname}${u.search ? '?' + u.search.slice(0, 200) : ''}`);

    if (e.request.postData?.text) {
      const body = e.request.postData.text;
      const ct = e.request.postData.mimeType || '';
      console.log(`    REQ-CT: ${ct}`);
      if (ct.includes('urlencoded')) {
        const form = decodeForm(body);
        for (const [k, v] of Object.entries(form)) {
          if (k === 'JSONString') {
            try {
              const j = JSON.parse(v);
              console.log(`    REQ JSONString:`);
              console.log(JSON.stringify(j, null, 2).split('\n').map(l => '       ' + l).join('\n'));
            } catch {
              console.log(`    REQ ${k}: ${v.slice(0, 400)}`);
            }
          } else {
            console.log(`    REQ ${k}: ${v.slice(0, 200)}`);
          }
        }
      } else {
        console.log(`    REQ: ${body.slice(0, 600)}`);
      }
    }

    if (e.response.content?.text) {
      const t = e.response.content.text;
      console.log(`    RES (${(t.length/1024).toFixed(1)}KB): ${t.slice(0, 800).replace(/\s+/g, ' ')}`);
    }
  }
}
