// 疎通確認 — 認証3点セット (Cookie + CSRF + Chrome UA) が機能しているかを最短で判定
import { listCustomFunctions } from '../client/booksClient.mjs';

const fns = await listCustomFunctions();
console.log(`✅ HTTP 200 — ${fns.length} 個の Custom Function を取得`);
for (const f of fns.slice(0, 5)) {
  console.log(`  - [${f.entity}] ${f.function_name}  (id=${f.customfunction_id})`);
}
if (fns.length > 5) console.log(`  ... and ${fns.length - 5} more`);
