// T10: 下書き作成 → 削除のドライラン（書込系の最小スモーク）
// 実装は T02 で API パスが確定してから入れる。現時点ではテンプレートのみ。

import { sGet, sPostJson, sDelete, PORTAL_ID, BRAND_ID, CHANNEL_TYPE, CHANNEL_ID } from './_social_lib.mjs';

console.log('=== T10 SMOKE: draft create -> delete ===');
console.log({ portal: PORTAL_ID, brand: BRAND_ID, channelType: CHANNEL_TYPE, channelId: CHANNEL_ID });

if (!BRAND_ID || !CHANNEL_ID) {
  console.error(`BRAND_ID / CHANNEL_ID(${CHANNEL_TYPE}) が未設定です。先に t01_probe と t02_har_extract を済ませてください。`);
  process.exit(1);
}

// TODO(T02 完了後): 実 path を埋める
// const create = await sPostJson(`/api/v1/${PORTAL_ID}/posts/draft`, {}, {
//   brandId: BRAND_ID,
//   channelIds: [CHANNEL_ID_LI_COMPANY],
//   content: '【SMOKE】Zoho Social internal API draft test',
// });
// console.log('create:', create.status, create.body);
//
// const id = create.body?.id;
// if (id) {
//   const del = await sDelete(`/api/v1/${PORTAL_ID}/posts/${id}`);
//   console.log('delete:', del.status, del.body);
// }

console.log('TODO: API path 確定後にコメントを外して有効化');
