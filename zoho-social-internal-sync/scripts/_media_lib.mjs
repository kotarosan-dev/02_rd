// 画像アップロード共通ロジック（post / draft / schedule から共有）
import { readFileSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { sPostMultipart, sPostForm } from './_social_lib.mjs';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
};

// PNG / JPEG / GIF から "W*H" を抽出（dimension 必須のため）
export function getDimension(buf, ext) {
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

// 画像 path[] を Zoho Social にアップロードし、メッセージに埋め込む medias[] descriptor を返す
export async function uploadImagesForPost(paths) {
  const SPACE_ID = process.env.ZOHO_SOCIAL_SPACE_ID;
  if (!SPACE_ID) throw new Error('ZOHO_SOCIAL_SPACE_ID 未設定');

  const uploaded = [];
  let counter = (Date.now() % 1000);
  console.log('=== Uploading ' + paths.length + ' image(s) ===');

  for (const p of paths) {
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
    console.log(`  [upload] ${name} (${stat.size}B, ${dim||'?'}) → ${r.status}`);
    if (!r.ok) throw new Error('AttachmentUpload failed: ' + r.text.slice(0, 200));
    const b = r.body || {};
    const fileid = b.fileid || b.fileId || b.file_id || '';
    uploaded.push({
      attachment_url: fileid ? `/ViewProfilePicture.do?fileId=${fileid}` : '',
      size: Number(b.file_size ?? stat.size),
      format: 1,
      type: 1,
      dimension: dim,
      name: b.filename || name,
    });
  }

  console.log('=== Registering to media library ===');
  const mediasArr = uploaded.map((u) => [{
    attachmentUrl: u.attachment_url, size: u.size, format: u.format,
    name: u.name, type: u.type, dimension: u.dimension,
    source: '0', created_time: Date.now(),
  }]);
  const r2 = await sPostForm('mediaAttachmentUpload.do', {
    action: 'add', medias: JSON.stringify(mediasArr),
  });
  console.log('  status:', r2.status, r2.ok ? 'OK' : r2.text.slice(0, 200));
  if (!r2.ok) throw new Error('mediaAttachmentUpload failed');

  // 投稿API向けに整形（messages[].medias[] に直接入れる形）
  return uploaded.map((u, i) => ({
    attachment_url: u.attachment_url,
    size: u.size, format: u.format, type: u.type,
    dimension: u.dimension, ispriority: i === 0, name: u.name,
  }));
}

// 同名フラグの繰り返し取得 helper
export function multiArg(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}`) {
      const v = process.argv[i + 1];
      if (v && !v.startsWith('--')) out.push(v);
    }
  }
  return out;
}
