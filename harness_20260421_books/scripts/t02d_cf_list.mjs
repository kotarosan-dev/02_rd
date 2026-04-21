// T02-D: Cookie + CSRF で Books の Custom Function 一覧取得（read-only）
// 認証が通るかの最小検証
import { bGet } from './_books_lib.mjs';

const r = await bGet('/api/v3/integrations/customfunctions?page=1&per_page=20&filter_by=Entity.All&sort_column=created_time&sort_order=A&usestate=false');

console.log('status:', r.status);
console.log('url:', r.url);
console.log('raw body (first 800):', r.text.slice(0, 800));
if (r.body) {
  const list = r.body.customfunctions || r.body.custom_functions || [];
  console.log(`関数数: ${list.length}`);
  console.log(`page_context: ${JSON.stringify(r.body.page_context || {})}`);
  for (const f of list) {
    console.log(`  - id=${f.customfunction_id || f.function_id || 'n/a'} name=${f.function_name} entity=${f.entity}`);
  }
} else {
  console.log('non-JSON body, first 500:');
  console.log(r.text.slice(0, 500));
}
