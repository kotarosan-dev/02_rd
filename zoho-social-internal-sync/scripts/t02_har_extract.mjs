// T02: docs/har/*.har を全て読み、内部 API の URL/Method/Body 概形を一覧化して
// artifacts/social-endpoints.txt と artifacts/social-endpoints.md に書き出す。
//
// books_endpoints と同じ流儀。HAR 解析後に手で docs/social-internal-api-spec.md にまとめる。

import fs from 'fs';
import path from 'path';

const HAR_DIR = path.resolve('docs/har');
const OUT_TXT = path.resolve('artifacts/social-endpoints.txt');
const OUT_MD = path.resolve('artifacts/social-endpoints.md');

if (!fs.existsSync(HAR_DIR)) {
  console.error(`HAR ディレクトリがありません: ${HAR_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(HAR_DIR).filter(f => f.endsWith('.har'));
if (files.length === 0) {
  console.error('docs/har/ に .har がありません。手順書 docs/har-capture-procedure-social.md を参照。');
  process.exit(1);
}

const rows = [];
for (const f of files) {
  const raw = fs.readFileSync(path.join(HAR_DIR, f), 'utf8');
  if (!raw.trim()) { console.warn(`skip empty: ${f}`); continue; }
  let har;
  try { har = JSON.parse(raw); } catch { console.warn(`skip invalid JSON: ${f}`); continue; }
  for (const e of har.log.entries) {
    const url = e.request.url;
    if (!/social\.zoho\./.test(url)) continue;
    if (!/(\/api\/|\/social\/|\.do(\?|$))/.test(url)) continue;
    if (/\.(js|css|png|jpg|jpeg|svg|woff2?|ico)(\?|$)/.test(url)) continue;

    const u = new URL(url);
    const ct = (e.request.headers.find(h => /content-type/i.test(h.name))?.value || '').split(';')[0];
    const reqLen = e.request.postData?.text?.length || 0;
    const resStatus = e.response.status;
    rows.push({
      file: f,
      method: e.request.method,
      path: u.pathname,
      query: u.searchParams.toString().slice(0, 120),
      status: resStatus,
      reqCt: ct,
      reqLen,
    });
  }
}

const uniq = new Map();
for (const r of rows) {
  const key = `${r.method} ${r.path}`;
  if (!uniq.has(key)) uniq.set(key, { ...r, count: 1, files: new Set([r.file]), statuses: new Set([r.status]) });
  else {
    const v = uniq.get(key);
    v.count += 1;
    v.files.add(r.file);
    v.statuses.add(r.status);
  }
}

const sorted = [...uniq.values()].sort((a, b) => a.path.localeCompare(b.path));

fs.mkdirSync(path.dirname(OUT_TXT), { recursive: true });
fs.writeFileSync(OUT_TXT, sorted.map(r =>
  `${r.method.padEnd(6)} ${r.path}  [${[...r.statuses].join(',')}]  x${r.count}  files=${[...r.files].join(',')}`
).join('\n'));

const md = [
  '# Social Internal Endpoints (auto-extracted)',
  '',
  '| Method | Path | Statuses | Count | HARs |',
  '| --- | --- | --- | --- | --- |',
  ...sorted.map(r =>
    `| ${r.method} | \`${r.path}\` | ${[...r.statuses].join(',')} | ${r.count} | ${[...r.files].join('<br>')} |`
  ),
].join('\n');
fs.writeFileSync(OUT_MD, md);

console.log(`OK: ${sorted.length} unique endpoints`);
console.log(`  ${OUT_TXT}`);
console.log(`  ${OUT_MD}`);
