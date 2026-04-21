// T01: Cookie + CSRF が活きているかの最小プローブ
// HAR 解析で判明した getportals アクションを叩く。

import { sPostForm, sGet, BASE, PORTAL_NAME, BRAND_ID } from './_social_lib.mjs';

console.log('=== Zoho Social internal API probe ===');
console.log({ BASE, PORTAL_NAME, BRAND_ID });
console.log('');

const tests = [
  { label: 'getportals (POST onezohoaction)', fn: () => sPostForm('null/null/onezohoaction.do', { action: 'getportals' }) },
  { label: 'getuserconfiguration (GET)',      fn: () => sGet('getuserconfiguration.do') },
  { label: 'getlicenseconfiguration (GET)',   fn: () => sGet('getlicenseconfiguration.do') },
  { label: 'GetBrandsInfo (GET)',             fn: () => sGet('GetBrandsInfo.do') },
];

for (const t of tests) {
  try {
    const r = await t.fn();
    const tag = r.ok ? '[OK]' : '[NG]';
    const sample = r.body ? JSON.stringify(r.body).slice(0, 220) : r.text.slice(0, 220);
    console.log(`${tag} ${r.status} :: ${t.label}`);
    console.log(`  ${sample}`);
    console.log('');
  } catch (e) {
    console.log(`[ERR] ${t.label}: ${e.message}`);
  }
}

console.log('200 + JSON が返れば認証成立。HTML が返るなら Cookie 失効 → 再採取。');
