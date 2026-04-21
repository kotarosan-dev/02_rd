// T02-C6: customfunctions 関連 XHR の Request/Response body を完全表示
import fs from 'fs';
import path from 'path';

const HAR_DIR = path.resolve('../zoho-deluge-sync/docs/har');
const HARS = ['books_c_function_create.har', 'books_d_function_execute.har'];

function decodeForm(s) {
  const out = {};
  for (const pair of s.split('&')) {
    const [k, v = ''] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

let counter = 0;
for (const h of HARS) {
  const har = JSON.parse(fs.readFileSync(path.join(HAR_DIR, h), 'utf8'));
  console.log(`\n========== ${h} ==========`);
  for (const e of (har.log?.entries || [])) {
    const url = e.request.url;
    if (!/customfunctions|entitylist/i.test(url)) continue;
    counter++;
    const u = new URL(url);
    console.log(`\n#${counter} ${e.request.method} ${e.response.status}  ${u.pathname}${u.search}`);

    if (e.request.postData?.text) {
      const ct = e.request.postData.mimeType || '';
      if (ct.includes('urlencoded')) {
        const form = decodeForm(e.request.postData.text);
        for (const [k, v] of Object.entries(form)) {
          if (k === 'JSONString') {
            try {
              const j = JSON.parse(v);
              console.log(`    REQ JSONString: ${JSON.stringify(j).slice(0, 600)}`);
            } catch { console.log(`    REQ ${k}: ${v.slice(0, 400)}`); }
          } else {
            console.log(`    REQ ${k}: ${v}`);
          }
        }
      }
    }

    if (e.response.content?.text) {
      const t = e.response.content.text;
      console.log(`    RES (${(t.length/1024).toFixed(1)}KB) full:`);
      // pretty print if JSON
      try {
        const j = JSON.parse(t);
        console.log(JSON.stringify(j, null, 2).split('\n').slice(0, 50).map(l => '       ' + l).join('\n'));
        if (Object.keys(j).length > 0) {
          console.log(`       (top keys: ${Object.keys(j).join(', ')})`);
        }
      } catch {
        console.log('       ' + t.slice(0, 1500));
      }
    }
  }
}
