// CLI: ブランド + 接続済みチャンネル一覧を表示
//   pnpm run list

import { sGet } from '../_social_lib.mjs';

const NETWORK_NAME = {
  '1': 'Facebook',
  '2': 'X (Twitter)',
  '3': 'LinkedIn(旧)',
  '5': 'Instagram',
  '6': 'Google My Business',
  '8': 'Pinterest',
  '10': 'LinkedIn',
  '11': 'YouTube',
  '12': 'TikTok',
  '13': 'Threads',
};

const r = await sGet('GetBrandsInfo.do');
if (!r.ok) {
  console.error('NG', r.status, r.text.slice(0, 200));
  process.exit(1);
}

console.log('=== Zoho Social: Brands & Channels ===\n');
for (const [brandId, b] of Object.entries(r.body)) {
  console.log(`[Brand] ${b.brandName}  (id=${brandId}, tz=${b.timezone}, admin=${b.permissions?.isBrandAdmin})`);
  if (!b.networks) { console.log('  (no networks)\n'); continue; }
  for (const [code, n] of Object.entries(b.networks)) {
    if (!n.CHANNELID) continue;
    const name = NETWORK_NAME[code] || `network-${code}`;
    const status = n.STATUS === 1 ? 'OK' : `STATUS=${n.STATUS}`;
    const profile = decodeURIComponent(n.PROFILE_NAME || '');
    console.log(`  - ${name.padEnd(18)} channel=${n.CHANNELID}  profile="${profile}"  [${status}]`);
  }
  console.log('');
}
