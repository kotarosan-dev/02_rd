// CLI: 下書き作成
//   node scripts/cli/draft.mjs --text "本文" [--image path ...] [--network linkedinprofile] [--dry]

import { sV2PostJson, BRAND_ID, CHANNEL_TYPE, NETWORK_STR } from '../_social_lib.mjs';
import { uploadImagesForPost, multiArg } from '../_media_lib.mjs';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const text = arg('text');
const dry = arg('dry', false) === true;
const networkArg = arg('network');
const images = multiArg('image');

if (!text && images.length === 0) {
  console.error('usage: node scripts/cli/draft.mjs --text "本文" [--image path ...] [--network linkedinprofile] [--dry]');
  process.exit(1);
}

const network = networkArg
  || (CHANNEL_TYPE === 'LINKEDIN_PERSONAL' ? 'linkedinprofile'
    : CHANNEL_TYPE === 'LINKEDIN_COMPANY' ? 'linkedincompany'
    : NETWORK_STR['10']);

let medias = [];
if (images.length > 0) {
  if (dry) console.log('[--dry] images would be uploaded:', images);
  else medias = await uploadImagesForPost(images);
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
    type: 6,
    is_publish_now: true,
    created_time: now,
    post_from: 1,
    timezone_str: 'Asia/Tokyo',
  },
};

console.log('=== draft create ===');
console.log('network:', network, ' brand:', BRAND_ID, ' images:', images.length);
console.log('text:', text);
console.log('payload:', JSON.stringify(payload));

if (dry) {
  console.log('[--dry] stop before sending');
  process.exit(0);
}

const r = await sV2PostJson('/social/v2/post/drafts', payload);
console.log('---');
console.log('status:', r.status);
console.log('body:', r.body ? JSON.stringify(r.body, null, 2) : r.text.slice(0, 500));
process.exit(r.ok ? 0 : 1);
