// Cookie が生きているかを多角的にチェック
import { bGet } from './_books_lib.mjs';

const tests = [
  '/api/v3/organizations',
  '/api/v3/contacts?per_page=1',
  '/api/v3/invoices?per_page=1',
  '/api/v3/settings/preferences/general',
  '/api/v3/settings/workflows?per_page=1',
  '/api/v3/integrations/customfunctions?page=1&per_page=1&filter_by=Entity.All&sort_column=created_time&sort_order=A&usestate=false',
];

for (const p of tests) {
  const r = await bGet(p);
  let summary = `${r.status}`;
  if (r.body && r.body.code !== undefined) summary += ` code=${r.body.code} msg=${r.body.message}`;
  else if (r.body) summary += ` keys=${Object.keys(r.body).slice(0,4).join(',')}`;
  else summary += ` non-json: ${r.text.slice(0,80)}`;
  console.log(p, '\n  →', summary);
}
