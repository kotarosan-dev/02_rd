// CLI: 即時投稿（LinkedIn 等に公開！）
//   テキストのみ:
//     node scripts/cli/post.mjs --text "本文" [--network linkedinprofile] --confirm
//   画像付き:
//     node scripts/cli/post.mjs --text "本文" --image path/to/img.png [--image ...] --confirm
//   テスト（公開せず下書きで動作確認）:
//     node scripts/cli/post.mjs --text "..." --image x.png --type 6 --confirm
//
// 安全装置: --confirm を付けない限り送信しない（画像アップロードもスキップ）。

import { sV2PostJson, BRAND_ID, CHANNEL_TYPE, NETWORK_STR } from '../_social_lib.mjs';
import { uploadImagesForPost, multiArg } from '../_media_lib.mjs';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const text = arg('text');
const confirm = arg('confirm', false) === true;
const networkArg = arg('network');
const endpoint = arg('endpoint', '/social/v2/post/drafts');
const images = multiArg('image');
const type = Number(arg('type', 1));  // 1=即時, 2=予約, 6=下書き

if (!text && images.length === 0) {
  console.error('usage: node scripts/cli/post.mjs --text "本文" [--image path ...] [--type 1|6] --confirm');
  process.exit(1);
}

const network = networkArg
  || (CHANNEL_TYPE === 'LINKEDIN_PERSONAL' ? 'linkedinprofile'
    : CHANNEL_TYPE === 'LINKEDIN_COMPANY' ? 'linkedincompany'
    : NETWORK_STR['10']);

let medias = [];
if (images.length > 0) {
  if (!confirm) {
    console.log('[DRY RUN] images would be uploaded:', images);
  } else {
    medias = await uploadImagesForPost(images);
  }
}

const now = Date.now();
const message = {
  channels: [{ network, brand: BRAND_ID, poll: {} }],
  message: text || '',
  has_media: medias.length > 0 ? 1 : 0,
  links: {},
};
if (medias.length > 0) message.medias = medias;

const payload = {
  post: {
    messages: [message],
    schedule_time: now,
    type,
    is_publish_now: true,
    created_time: now,
    post_from: 1,
    timezone_str: 'Asia/Tokyo',
  },
};

console.log('=== POST (' + (type === 1 ? 'PUBLISH NOW' : type === 6 ? 'DRAFT' : 'type=' + type) + ' to ' + network + ') ===');
console.log('endpoint:', endpoint);
console.log('text:', text);
console.log('images:', images.length);
console.log('payload:', JSON.stringify(payload));

if (!confirm) {
  console.log('\n[DRY RUN] --confirm not set.');
  process.exit(0);
}

const r = await sV2PostJson(endpoint, payload);
console.log('---');
console.log('status:', r.status);
console.log('body:', r.body ? JSON.stringify(r.body, null, 2) : r.text.slice(0, 800));
process.exit(r.ok ? 0 : 1);
