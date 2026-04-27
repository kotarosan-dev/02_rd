// Purpose: Safely verify Zoho CRM Function create/list/delete through internal API.

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function mode() {
  return process.env.ZOHO_MODE === 'apply' ? 'apply' : 'dry_run';
}

function requiredEnv() {
  return ['ZOHO_BASE_URL', 'ZOHO_COOKIE', 'ZOHO_CSRF_TOKEN', 'ZOHO_ORG_ID'];
}

function missingEnv() {
  return requiredEnv().filter((key) => !process.env[key]);
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    const normalized = key.toLowerCase();
    if (
      normalized.includes('cookie')
      || normalized.includes('csrf')
      || normalized.includes('token')
      || normalized === 'authorization'
      || normalized === 'x-zcsrf-token'
    ) {
      return [key, '[redacted]'];
    }
    return [key, sanitize(entry)];
  }));
}

function assertAllowedBaseUrl(raw) {
  const url = new URL(raw);
  const allowed = new Set([
    'crm.zoho.jp',
    'crm.zoho.com',
    'crm.zoho.eu',
    'crm.zoho.in',
    'crm.zoho.com.au',
  ]);
  if (!allowed.has(url.host)) {
    throw new Error(`disallowed_crm_host:${url.host}`);
  }
  return `${url.protocol}//${url.host}`;
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

class InternalCrmFunctionClient {
  constructor({ baseUrl, orgId, cookie, csrfToken, currentMode }) {
    this.baseUrl = assertAllowedBaseUrl(baseUrl);
    this.orgId = orgId;
    this.cookie = cookie;
    this.csrfToken = csrfToken;
    this.mode = currentMode;
  }

  async request(method, path, { params, body, contentType } = {}) {
    const upperMethod = method.toUpperCase();
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const request = {
      method: upperMethod,
      url: `${url.origin}${url.pathname}${url.search}`,
      body,
      contentType,
    };

    if (WRITE_METHODS.has(upperMethod) && this.mode !== 'apply') {
      return {
        ok: true,
        skipped: true,
        reason: 'dry_run_write_blocked',
        request: sanitize(request),
      };
    }

    const res = await fetch(url, {
      method: upperMethod,
      headers: {
        Accept: '*/*',
        'Accept-Language': 'ja',
        'Content-Type': contentType || 'application/json; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'X-ZCSRF-TOKEN': this.csrfToken,
        'X-CRM-ORG': this.orgId,
        Cookie: this.cookie,
      },
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
    const responseBody = await parseResponse(res);

    return {
      ok: res.ok,
      skipped: false,
      request: sanitize(request),
      response: {
        http_status: res.status,
        body: sanitize(responseBody),
      },
    };
  }

  list() {
    return this.request('GET', '/crm/v2/settings/functions', {
      params: { type: 'org', start: '1', limit: '200' },
    });
  }

  create(name) {
    return this.request('POST', '/crm/v2/settings/functions', {
      params: { language: 'deluge' },
      contentType: 'application/json; charset=UTF-8',
      body: {
        functions: [
          {
            name,
            display_name: name,
            description: 'Disposable GPT5.5 internal API CRUD smoke. Delete immediately.',
            return_type: 'void',
            params: [],
            category: 'automation',
          },
        ],
      },
    });
  }

  get(id) {
    return this.request('GET', `/crm/v2/settings/functions/${encodeURIComponent(id)}`, {
      params: { source: 'crm' },
    });
  }

  delete(id) {
    return this.request('DELETE', `/crm/v2/settings/functions/${encodeURIComponent(id)}`);
  }
}

function findFunctionByName(listResult, name) {
  const rows = listResult.response?.body?.functions || [];
  return rows.find((row) => row?.api_name === name || row?.name === name || row?.display_name === name) || null;
}

async function main() {
  const currentMode = mode();
  const missing = missingEnv();
  const marker = `_qa_gpt55_function_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const summary = {
    ok: false,
    mode: currentMode,
    marker,
    phases: [],
    cleanup: {
      attempted: false,
      deleted_id: null,
      residual_found: null,
    },
  };

  if (missing.length) {
    summary.phases.push({ phase: 'env', ok: false, missing });
    console.log(JSON.stringify(summary, null, 2));
    process.exit(2);
  }

  const client = new InternalCrmFunctionClient({
    baseUrl: process.env.ZOHO_BASE_URL,
    orgId: process.env.ZOHO_ORG_ID,
    cookie: process.env.ZOHO_COOKIE,
    csrfToken: process.env.ZOHO_CSRF_TOKEN,
    currentMode,
  });

  let createdId = null;
  try {
    const beforeList = await client.list();
    summary.phases.push({
      phase: 'list_before',
      ok: beforeList.ok,
      http_status: beforeList.response?.http_status,
      function_count: beforeList.response?.body?.functions?.length,
      existing_marker_found: Boolean(findFunctionByName(beforeList, marker)),
    });
    if (!beforeList.ok) throw new Error('list_before_failed');

    const create = await client.create(marker);
    const createRow = create.response?.body?.functions?.[0] || {};
    createdId = createRow.details?.id || null;
    summary.phases.push({
      phase: 'create',
      ok: create.ok,
      skipped: create.skipped,
      reason: create.reason,
      http_status: create.response?.http_status,
      code: createRow.code,
      status: createRow.status,
      id: createdId,
      message: createRow.message,
      request: create.skipped ? create.request : undefined,
    });

    if (currentMode !== 'apply') {
      summary.ok = create.ok && create.skipped === true;
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    if (!create.ok || createRow.status !== 'success') throw new Error('create_failed');

    if (!createdId) {
      const afterCreateList = await client.list();
      const created = findFunctionByName(afterCreateList, marker);
      createdId = created?.id || null;
    }
    if (!createdId) throw new Error('created_id_not_resolved');

    const get = await client.get(createdId);
    const getRow = get.response?.body?.functions?.[0] || {};
    summary.phases.push({
      phase: 'get_created',
      ok: get.ok,
      http_status: get.response?.http_status,
      id: getRow.id || createdId,
      api_name_matches: getRow.api_name === marker || getRow.name === marker || getRow.display_name === marker,
    });
    if (!get.ok) throw new Error('get_created_failed');

    summary.ok = true;
  } finally {
    if (currentMode === 'apply' && createdId) {
      summary.cleanup.attempted = true;
      const del = await client.delete(createdId);
      const delRow = del.response?.body?.functions?.[0] || {};
      summary.phases.push({
        phase: 'delete',
        ok: del.ok,
        http_status: del.response?.http_status,
        code: delRow.code,
        status: delRow.status,
        id: delRow.details?.id || createdId,
        message: delRow.message,
      });
      summary.cleanup.deleted_id = delRow.details?.id || createdId;

      const residual = await client.list();
      const residualRow = findFunctionByName(residual, marker);
      summary.cleanup.residual_found = Boolean(residualRow);
      summary.phases.push({
        phase: 'residual_check',
        ok: residual.ok && !residualRow,
        http_status: residual.response?.http_status,
        residual_found: Boolean(residualRow),
      });
      summary.ok = summary.ok && del.ok && !residualRow;
    }

    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
