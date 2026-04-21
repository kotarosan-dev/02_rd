// Zoho Books 内部 API クライアント
// ⚠️ 自社 Org 専用。クライアント Org・他人 Cookie での使用禁止。skill 化禁止。
// 詳細仕様: ../../docs/internal-api-spec.md（origin: harness_20260421_books/docs/books-internal-api-spec.md）

const need = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`環境変数 ${k} が未設定です（.env.books を確認）`);
  return v;
};

export const BASE = process.env.ZOHO_BOOKS_BASE_URL || 'https://books.zoho.jp';
export const ORG_ID = need('ZOHO_BOOKS_ORG_ID');

function commonHeaders() {
  const h = {
    'Cookie': need('ZOHO_BOOKS_COOKIE'),
    'X-ZCSRF-TOKEN': need('ZOHO_BOOKS_CSRF_TOKEN'),
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': BASE,
    'Referer': `${BASE}/app/${ORG_ID}`,
    'X-ZB-SOURCE': process.env.ZOHO_BOOKS_SOURCE || 'zbclient',
    'X-ZOHO-Include-Formatted': 'true',
    // ⚠️ 必須: Node デフォルト UA だと Zoho IAM が step-up auth を強制 (code 1071)
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'ja',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
  if (process.env.ZOHO_BOOKS_ROLE_ID) h['X-ROLE-ID'] = process.env.ZOHO_BOOKS_ROLE_ID;
  if (process.env.ZOHO_BOOKS_ASSET_VERSION) h['X-ZB-Asset-Version'] = process.env.ZOHO_BOOKS_ASSET_VERSION;
  return h;
}

const tryJson = (t) => { try { return JSON.parse(t); } catch { return null; } };

async function call(method, p, opts = {}) {
  const headers = commonHeaders();
  let body, url;
  if (opts.json) {
    // POST/PUT: organization_id は body 側だけ（URL と body 両方に書くと code 12）
    body = `JSONString=${encodeURIComponent(JSON.stringify(opts.json))}&organization_id=${ORG_ID}`;
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    url = `${BASE}${p}`;
  } else {
    // GET/DELETE: organization_id は URL クエリに追加
    url = `${BASE}${p}${p.includes('?') ? '&' : '?'}organization_id=${ORG_ID}`;
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: tryJson(text), text };
}

export const bGet    = (p)        => call('GET', p);
export const bPost   = (p, json)  => call('POST', p, { json });
export const bPut    = (p, json)  => call('PUT', p, { json });
export const bDelete = (p)        => call('DELETE', p);

// 本番書き込みガード
export function assertProdWriteAllowed(actionLabel) {
  if (process.env.ZOHO_BOOKS_ALLOW_PROD_WRITE !== '1') {
    console.error(`\n❌ ${actionLabel} は書き込み操作です。`);
    console.error(`   実行するには .env.books の ZOHO_BOOKS_ALLOW_PROD_WRITE=1 に変更してください。\n`);
    process.exit(2);
  }
}

// === Custom Function ドメイン操作 ===

export async function listCustomFunctions({ entity = 'All', perPage = 200 } = {}) {
  const r = await bGet(`/api/v3/integrations/customfunctions?page=1&per_page=${perPage}&filter_by=Entity.${entity}&sort_column=function_name&sort_order=A&usestate=false`);
  if (!r.ok) throw new Error(`list failed: HTTP ${r.status} ${r.text.slice(0,200)}`);
  return r.body.customfunctions || [];
}

export async function getCustomFunction({ id, entity }) {
  const r = await bGet(`/api/v3/integrations/customfunctions/editpage?customfunction_id=${id}&entity=${entity}`);
  if (!r.ok) throw new Error(`get failed: HTTP ${r.status}`);
  return r.body;
}

export async function createCustomFunction({ name, entity, script, description = '' }) {
  const r = await bPost('/api/v3/integrations/customfunctions', {
    function_name: name,
    description,
    entity,
    language: 'deluge',
    script,
    include_orgvariables_params: false,
    return_type: 'void',
  });
  if (!r.ok) throw new Error(`create failed: HTTP ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

export async function updateCustomFunction({ id, name, entity, script, description = '', execute = false, sampleEntityId = null }) {
  const payload = {
    function_name: name,
    description,
    entity,
    language: 'deluge',
    script,
    is_execute: execute,
    include_orgvariables_params: false,
    return_type: 'void',
  };
  if (execute) {
    if (!sampleEntityId) throw new Error('execute=true には sampleEntityId が必須');
    payload.sample_param = { entity_id: sampleEntityId };
  }
  const r = await bPut(`/api/v3/integrations/customfunctions/${id}`, payload);
  if (!r.ok) throw new Error(`update failed: HTTP ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

export async function deleteCustomFunction(id) {
  const r = await bDelete(`/api/v3/integrations/customfunctions/${id}`);
  if (!r.ok) throw new Error(`delete failed: HTTP ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

export async function getSampleEntityId(entity) {
  const r = await bGet(`/api/v3/entitylist?entity=${entity}&page=1&per_page=5`);
  if (!r.ok) return null;
  const row = r.body?.data?.[0];
  return row && (row[`${entity}_id`] || row.entity_id || row.id) || null;
}
