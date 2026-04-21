// .env.social を読み込んでから他の mjs を起動するヘルパー（PowerShell 引数衝突回避）
// 使い方: node scripts/_run_with_env.mjs scripts/cli/upload.mjs --image tmp.png
import { readFileSync } from 'node:fs';
for (const ln of readFileSync('.env.social', 'utf8').split(/\r?\n/)) {
  const m = ln.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const target = process.argv[2];
process.argv = [process.argv[0], target, ...process.argv.slice(3)];
await import('../' + target);
