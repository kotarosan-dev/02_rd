// T01-B: Books 公式 API 読み取りマトリクス（20 エンドポイント GET）
import { getBooksToken, booksGet } from './_lib.mjs';

const BOOKS_ORG_ID = '90000792806';

const ENDPOINTS = [
  { id: 'B-01', path: '/organizations',                listKey: 'organizations',     orgQuery: false },
  { id: 'B-02', path: '/chartofaccounts',              listKey: 'chartofaccounts',   orgQuery: true  },
  { id: 'B-03', path: '/settings/taxes',               listKey: 'taxes',             orgQuery: true  },
  { id: 'B-04', path: '/items',                        listKey: 'items',             orgQuery: true  },
  { id: 'B-05', path: '/contacts',                     listKey: 'contacts',          orgQuery: true  },
  { id: 'B-06', path: '/invoices',                     listKey: 'invoices',          orgQuery: true  },
  { id: 'B-07', path: '/estimates',                    listKey: 'estimates',         orgQuery: true  },
  { id: 'B-08', path: '/salesorders',                  listKey: 'salesorders',       orgQuery: true  },
  { id: 'B-09', path: '/bills',                        listKey: 'bills',             orgQuery: true  },
  { id: 'B-10', path: '/customerpayments',             listKey: 'customerpayments',  orgQuery: true  },
  { id: 'B-11', path: '/vendorpayments',               listKey: 'vendorpayments',    orgQuery: true  },
  { id: 'B-12', path: '/paymentlinks',                 listKey: 'payment_links',     orgQuery: true  },
  { id: 'B-13', path: '/settings/preferences',         listKey: 'preferences',       orgQuery: true  },
  { id: 'B-14', path: '/users',                        listKey: 'users',             orgQuery: true  },
  { id: 'B-15', path: '/settings/currencies',          listKey: 'currencies',        orgQuery: true  },
  { id: 'B-16', path: '/bankaccounts',                 listKey: 'bankaccounts',      orgQuery: true  },
  { id: 'B-17', path: '/projects',                     listKey: 'projects',          orgQuery: true  },
  { id: 'B-18', path: '/expenses',                     listKey: 'expenses',          orgQuery: true  },
  { id: 'B-19', path: '/journals',                     listKey: 'journals',          orgQuery: true  },
  { id: 'B-20', path: '/recurringinvoices',            listKey: 'recurring_invoices',orgQuery: true  },
  // bonus probes (おまけ)
  { id: 'B-21', path: '/creditnotes',                  listKey: 'creditnotes',       orgQuery: true  },
  { id: 'B-22', path: '/purchaseorders',               listKey: 'purchaseorders',    orgQuery: true  },
  { id: 'B-23', path: '/vendorcredits',                listKey: 'vendorcredits',     orgQuery: true  },
  { id: 'B-24', path: '/transactions',                 listKey: 'transactions',      orgQuery: true  },
];

const token = await getBooksToken(BOOKS_ORG_ID);
console.log('=== T01-B: Books read matrix ===');
console.log(`org_id = ${BOOKS_ORG_ID}\n`);

const results = [];
for (const e of ENDPOINTS) {
  const r = await booksGet(e.path, { token, orgId: e.orgQuery ? BOOKS_ORG_ID : null, query: { per_page: 1 } });
  const list = r.json?.[e.listKey];
  const count = Array.isArray(list) ? list.length : (list ? '(obj)' : '-');
  const verdict = r.status === 200 ? 'PASS' : (r.status === 404 ? 'NOT_FOUND' : (r.status === 403 ? 'FORBIDDEN' : 'FAIL'));
  const code = r.json?.code;
  const msg = (r.json?.message || '').slice(0, 80);
  console.log(`${e.id} ${e.path.padEnd(28)} HTTP=${r.status} code=${code ?? '-'} listKey=${e.listKey.padEnd(20)} count=${String(count).padEnd(6)} ${verdict} ${msg}`);
  results.push({ id: e.id, path: e.path, http: r.status, code, msg, list_len: count, verdict });
}

console.log('\n=== summary ===');
const pass = results.filter(r => r.verdict === 'PASS').length;
const forbidden = results.filter(r => r.verdict === 'FORBIDDEN').length;
const notFound = results.filter(r => r.verdict === 'NOT_FOUND').length;
const fail = results.filter(r => r.verdict === 'FAIL').length;
console.log(`PASS=${pass}  FORBIDDEN=${forbidden}  NOT_FOUND=${notFound}  FAIL=${fail}  TOTAL=${results.length}`);

if (process.argv.includes('--json')) {
  console.log('\n--- JSON ---');
  console.log(JSON.stringify(results, null, 2));
}
