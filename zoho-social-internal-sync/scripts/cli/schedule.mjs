// CLI: 予約投稿
//   node scripts/cli/schedule.mjs --text "本文" --at "2026-04-22T09:00:00+09:00" --confirm
//   既定 endpoint: /social/v2/post/drafts (HAR 上 draft/post-now と同一)
//   既定 type: 2 (推測。1=publish-now / 6=draft が確認済みなので、間は schedule の可能性大)
//   --type N で上書き可。--variants で 2/3/4 を順に試す。

import { sV2PostJson, BRAND_ID, CHANNEL_TYPE, NETWORK_STR } from '../_social_lib.mjs';
import { uploadImagesForPost, multiArg } from '../_media_lib.mjs';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const text = arg('text');
const atRaw = arg('at');
const confirm = arg('confirm', false) === true;
const networkArg = arg('network');
const typeArg = arg('type');
const variants = arg('variants', false) === true;
const endpoint = arg('endpoint', '/social/v2/post/drafts');
const images = multiArg('image');

if (!text || !atRaw) {
  console.error('usage: node scripts/cli/schedule.mjs --text "本文" --at "2026-04-22T09:00:00+09:00" --confirm');
  console.error('  optional: --type 2  --variants  --network linkedinprofile  --endpoint /social/v2/post/drafts');
  process.exit(1);
}

const scheduleTime = new Date(atRaw).getTime();
if (Number.isNaN(scheduleTime)) {
  console.error('invalid --at:', atRaw);
  process.exit(1);
}
if (scheduleTime <= Date.now() + 60 * 1000) {
  console.error('--at は 1 分以上未来を指定してください (now=' + new Date().toISOString() + ')');
  process.exit(1);
}

const network = networkArg
  || (CHANNEL_TYPE === 'LINKEDIN_PERSONAL' ? 'linkedinprofile'
    : CHANNEL_TYPE === 'LINKEDIN_COMPANY' ? 'linkedincompany'
    : NETWORK_STR['10']);

let medias = [];
function buildPayload(type) {
  const now = Date.now();
  const message = {
    channels: [{ network, brand: BRAND_ID, poll: {} }],
    message: text,
    has_media: medias.length > 0 ? 1 : 0,
    links: {},
  };
  if (medias.length > 0) message.medias = medias;
  return {
    post: {
      messages: [message],
      schedule_time: scheduleTime,
      type,
      is_publish_now: false,
      created_time: now,
      post_from: 1,
      timezone_str: 'Asia/Tokyo',
    },
  };
}

console.log('=== SCHEDULE POST ===');
console.log('endpoint:', endpoint);
console.log('network:', network);
console.log('schedule_time:', new Date(scheduleTime).toISOString(), `(epoch=${scheduleTime})`);
console.log('text:', text);

const types = variants ? [2, 3, 4, 5] : [Number(typeArg) || 2];
console.log('types to try:', types);

if (!confirm) {
  console.log('\n[DRY RUN] --confirm not set.');
  if (images.length) console.log('  images would be uploaded:', images);
  for (const t of types) {
    console.log(`  type=${t} payload:`, JSON.stringify(buildPayload(t)));
  }
  console.log('Re-run with --confirm to actually schedule.');
  process.exit(0);
}

if (images.length > 0) medias = await uploadImagesForPost(images);

let lastOk = false;
for (const t of types) {
  const payload = buildPayload(t);
  const r = await sV2PostJson(endpoint, payload);
  console.log(`--- type=${t} ---`);
  console.log('  status:', r.status);
  console.log('  body:', r.body ? JSON.stringify(r.body).slice(0, 400) : r.text.slice(0, 400));
  if (r.ok && r.body?.response?.[0]?.success) {
    lastOk = true;
    if (!variants) break;
  }
}
console.log('\n→ Zoho Social の "予約済み (Scheduled)" タブを確認してください。');
process.exit(lastOk ? 0 : 1);
