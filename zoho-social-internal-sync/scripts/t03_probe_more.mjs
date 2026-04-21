// T03: 追加HARなしで叩けるエンドポイントを探索
// /social/v2/post/* 系の GET と、Reports / List 候補を試す。

import { sV2Get, sGet, sPostForm, BRAND_ID } from './_social_lib.mjs';

const tests = [
  // v2 GET 候補（ListはRESTっぽいパターンを試す）
  { label: 'v2 GET drafts',           fn: () => sV2Get('/social/v2/post/drafts') },
  { label: 'v2 GET published',        fn: () => sV2Get('/social/v2/post/published') },
  { label: 'v2 GET scheduled',        fn: () => sV2Get('/social/v2/post/scheduled') },
  { label: 'v2 GET posts',            fn: () => sV2Get('/social/v2/post/posts') },
  { label: 'v2 GET posts type=6',     fn: () => sV2Get('/social/v2/post/posts', { type: 6 }) },
  { label: 'v2 GET posts type=2',     fn: () => sV2Get('/social/v2/post/posts', { type: 2 }) },
  { label: 'v2 GET posts type=1',     fn: () => sV2Get('/social/v2/post/posts', { type: 1 }) },

  // Reports / Metrics
  { label: 'populatedashboardmetrics POST', fn: () => sPostForm('populatedashboardmetrics.do', { brand_id: BRAND_ID }) },
  { label: 'getsocialchanneldashboard GET', fn: () => sGet('getsocialchanneldashboard.do') },

  // 既存下書き取得API候補
  { label: 'getSavedData.do',         fn: () => sGet('getSavedData.do') },
];

console.log('=== T03 探索 ===\n');
for (const t of tests) {
  try {
    const r = await t.fn();
    const tag = r.ok ? '[OK]' : '[NG]';
    const ct = r.body ? 'JSON' : (/<html/i.test(r.text) ? 'HTML(login?)' : 'TEXT');
    const sample = r.body ? JSON.stringify(r.body).slice(0, 250) : r.text.slice(0, 200);
    console.log(`${tag} ${r.status} (${ct}) :: ${t.label}`);
    console.log(`  ${sample}`);
    console.log('');
  } catch (e) {
    console.log(`[ERR] ${t.label}: ${e.message}\n`);
  }
}
