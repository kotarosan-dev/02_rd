// T04: 一覧系 v1 .do エンドポイントの当てずっぽうプローブ

import { sGet, sPostForm, BRAND_ID, CHANNEL_ID } from './_social_lib.mjs';

const tests = [
  { l: 'GetPosts.do',                 fn: () => sGet('GetPosts.do') },
  { l: 'getposts.do',                 fn: () => sGet('getposts.do') },
  { l: 'PostsAjaxAction.do',          fn: () => sGet('PostsAjaxAction.do') },
  { l: 'getpostlist.do',              fn: () => sGet('getpostlist.do') },
  { l: 'populateposts.do',            fn: () => sGet('populateposts.do') },
  { l: 'populatepostsforbrand.do',    fn: () => sPostForm('populatepostsforbrand.do', { prid: BRAND_ID, network: 10 }) },
  { l: 'populatedrafts.do',           fn: () => sPostForm('populatedrafts.do', { prid: BRAND_ID }) },
  { l: 'getDrafts.do',                fn: () => sGet('getDrafts.do') },
  { l: 'getdrafts.do',                fn: () => sGet('getdrafts.do') },
  { l: 'getScheduledPosts.do',        fn: () => sGet('getScheduledPosts.do') },
  { l: 'getscheduledposts.do',        fn: () => sGet('getscheduledposts.do') },
  { l: 'GetSavedData.do?type=draft',  fn: () => sGet('getSavedData.do', { type: 'draft' }) },
  { l: 'GetSavedData.do?type=scheduled', fn: () => sGet('getSavedData.do', { type: 'scheduled' }) },
  { l: 'pubpubgetposts.do',           fn: () => sGet('pubpubgetposts.do') },
  // 削除系
  { l: 'DELETE-like deletepost.do',   fn: () => sPostForm('deletepost.do', { prid: BRAND_ID, postid: 'fake' }) },
  // メトリクス系
  { l: 'populatedashboardmetrics body', fn: () => sPostForm('populatedashboardmetrics.do', { prid: BRAND_ID, network: 10, channel: CHANNEL_ID }) },
  { l: 'GetCustomReportData.do',      fn: () => sGet('GetCustomReportData.do') },
  { l: 'getReportData.do',            fn: () => sGet('getReportData.do') },
];

console.log('=== T04 list probes ===\n');
for (const t of tests) {
  try {
    const r = await t.fn();
    const tag = r.ok ? '[OK]' : '[NG]';
    const ct = r.body ? 'JSON' : (/<html/i.test(r.text) ? 'HTML' : `TXT(${r.text.length}b)`);
    let sample = r.body ? JSON.stringify(r.body).slice(0, 200) : r.text.slice(0, 120).replace(/\s+/g, ' ');
    console.log(`${tag} ${r.status} (${ct}) :: ${t.l}`);
    if (sample.trim()) console.log(`   ${sample}`);
  } catch (e) {
    console.log(`[ERR] ${t.l}: ${e.message}`);
  }
}
