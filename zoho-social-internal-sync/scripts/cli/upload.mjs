// CLI: 画像をアップロードしてメディアライブラリに登録
//   node scripts/cli/upload.mjs --image path/to/img1.png [--image path/to/img2.png ...]
//
// 2 段階フロー（HAR より）:
//   1) POST AttachmentUpload.do?action=add  (multipart)
//      fields: cmcsrfparam, image_count(連番), spaceId, file
//      → JSON で attachmentUrl, size, format, name, type, dimension などを返す想定
//   2) POST mediaAttachmentUpload.do        (form-urlencoded)
//      fields: action=add, medias=[[{...}], [{...}]]  ← 画像ごとに 1 配列、それを配列で包む
//      → メディアライブラリに登録
//
// 出力: 投稿APIに渡すための media descriptor 配列を JSON で stdout に吐く。
//        これを scripts/cli/post.mjs --image-json '<...>' で渡せるようにする予定。

import { readFileSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { sPostMultipart, sPostForm, PORTAL_NAME, BRAND_ID } from '../_social_lib.mjs';

const SPACE_ID = process.env.ZOHO_SOCIAL_SPACE_ID;
if (!SPACE_ID) {
  console.error('ZOHO_SOCIAL_SPACE_ID が未設定です（.env.social を確認）');
  process.exit(1);
}

function args(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}`) {
      const v = process.argv[i + 1];
      if (v && !v.startsWith('--')) out.push(v);
    }
  }
  return out;
}

const images = args('image');
if (images.length === 0) {
  console.error('usage: node scripts/cli/upload.mjs --image <path> [--image <path> ...]');
  process.exit(1);
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
};

function getDimension(buf, ext) {
  try {
    if (ext === '.png') return `${buf.readUInt32BE(16)}*${buf.readUInt32BE(20)}`;
    if (ext === '.gif') return `${buf.readUInt16LE(6)}*${buf.readUInt16LE(8)}`;
    if (ext === '.jpg' || ext === '.jpeg') {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) break;
        const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
        if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
          return `${buf.readUInt16BE(i + 7)}*${buf.readUInt16BE(i + 5)}`;
        }
        i += 2 + len;
      }
    }
  } catch {}
  return '';
}

console.log('=== Step 1: AttachmentUpload.do (multipart) ===');
const uploaded = [];
let counter = Date.now() % 1000; // 適当な開始値（HAR では 12, 13 と連番）
for (const p of images) {
  const abs = resolve(p);
  const stat = statSync(abs);
  const buf = readFileSync(abs);
  const name = basename(abs);
  const ext = extname(name).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const dim = getDimension(buf, ext);
  counter += 1;

  const blob = new Blob([buf], { type: mime });
  const r = await sPostMultipart('AttachmentUpload.do?action=add', {
    image_count: String(counter),
    spaceId: SPACE_ID,
  }, [{ name: 'file', blob, filename: name }]);

  console.log(`  upload ${name} (${stat.size}B) → status=${r.status}`);
  if (!r.ok) {
    console.error('  body:', r.text.slice(0, 400));
    process.exit(1);
  }
  // レスポンスは JSON で attachmentUrl, fileId 等を含む想定
  console.log('  resp:', r.body ? JSON.stringify(r.body) : r.text.slice(0, 300));

  // AttachmentUpload.do の応答: {filename, response, image_count, file_size, fileid}
  // attachmentUrl は応答に含まれないため /ViewProfilePicture.do?fileId=<fileid> として構築
  const b = r.body || {};
  const fileid = b.fileid || b.fileId || b.file_id || '';
  const desc = {
    attachment_url: fileid ? `/ViewProfilePicture.do?fileId=${fileid}` : '',
    size: Number(b.file_size ?? b.size ?? stat.size),
    format: b.format ?? 1,
    name: b.filename || name,
    type: b.type ?? 1,
    dimension: dim,
    fileid,
  };
  uploaded.push(desc);
}

console.log('\n=== Step 2: mediaAttachmentUpload.do (register) ===');
// HAR の medias 値: [[{...img1}], [{...img2}]]  ← 1画像 = 1配列、それらの配列
const mediasArr = uploaded.map((u) => [{
  attachmentUrl: u.attachment_url,
  size: u.size, format: u.format, name: u.name, type: u.type,
  dimension: u.dimension, source: '0', created_time: Date.now(),
}]);

const r2 = await sPostForm('mediaAttachmentUpload.do', {
  action: 'add',
  medias: JSON.stringify(mediasArr),
});
console.log('  status:', r2.status);
console.log('  body:', r2.body ? JSON.stringify(r2.body) : r2.text.slice(0, 500));

if (!r2.ok) {
  console.error('mediaAttachmentUpload failed.');
  process.exit(1);
}

// 投稿APIで使う形式（messages[].medias[]）に整形して出力
const forPost = uploaded.map((u, i) => ({
  attachment_url: u.attachment_url,
  size: u.size, format: u.format, type: u.type,
  dimension: u.dimension, ispriority: i === 0, name: u.name,
}));
console.log('\n=== MEDIA DESCRIPTORS (drop into post body messages[].medias) ===');
console.log(JSON.stringify(forPost, null, 2));
