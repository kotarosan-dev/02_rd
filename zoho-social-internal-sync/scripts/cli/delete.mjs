// CLI: 投稿/下書き/予約 削除
//   node scripts/cli/delete.mjs --postid 2272000000293067 [--type 2] [--message-id ...] [--network 10] --confirm
//
// type: 1=即時(=published)/2=予約/6=下書き  既定 6
// message_id: 未指定時は postid-1 を試す（HAR 観察ベースの推測）
// networks: HAR では '10' (LinkedIn) 単独。複数なら "10,2" のようにカンマ区切り
//
// HAR 由来エンドポイント: /social/{portal}/{brand}/DeleteScheduleAction.do (v1 form)

import { sPostForm } from '../_social_lib.mjs';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const postid = arg('postid');
const messageIdArg = arg('message-id');
const type = String(arg('type', 6));
const networks = String(arg('network', 10));
const confirm = arg('confirm', false) === true;

if (!postid) {
  console.error('usage: node scripts/cli/delete.mjs --postid <id> [--type 6] [--message-id <id>] [--network 10] --confirm');
  process.exit(1);
}

const messageId = messageIdArg || (BigInt(postid) - 1n).toString();
const tabview = type === '6' ? '#posts/drafts' : type === '2' ? '#posts/scheduled' : '#posts/published';

const body = {
  action: 'delete',
  filter: 'true',
  post_id: postid,
  message_id: messageId,
  posttype: type,
  is_timewarp: 'false',
  is_parent: 'false',
  networks,
  post_from: '1',
  tabview,
};

console.log('=== DELETE post ===');
console.log({ postid, messageId, type, networks, tabview });
console.log('body:', new URLSearchParams(body).toString());

if (!confirm) {
  console.log('\n[DRY RUN] --confirm not set.');
  process.exit(0);
}

const r = await sPostForm('DeleteScheduleAction.do', body);
console.log('---');
console.log('status:', r.status);
console.log('body:', r.body ? JSON.stringify(r.body) : (r.text.slice(0, 400) || '(empty)'));
process.exit(r.ok ? 0 : 1);
