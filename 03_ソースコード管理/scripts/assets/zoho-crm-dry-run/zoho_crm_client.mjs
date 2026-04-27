// Purpose: Reusable Zoho CRM API client with dry-run write protection.

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const DC_MAP = {
  jp: { accountsHost: 'accounts.zoho.jp', apiHost: 'www.zohoapis.jp' },
  us: { accountsHost: 'accounts.zoho.com', apiHost: 'www.zohoapis.com' },
  eu: { accountsHost: 'accounts.zoho.eu', apiHost: 'www.zohoapis.eu' },
  in: { accountsHost: 'accounts.zoho.in', apiHost: 'www.zohoapis.in' },
  au: { accountsHost: 'accounts.zoho.com.au', apiHost: 'www.zohoapis.com.au' },
  ca: { accountsHost: 'accounts.zohocloud.ca', apiHost: 'www.zohoapis.ca' },
};

const ALLOWED_API_HOSTS = new Set(Object.values(DC_MAP).map((entry) => entry.apiHost));

export function resolveZohoCrmEnvironment(env = process.env) {
  const dc = (env.ZOHO_DC || env.ZOHO_DATA_CENTER || 'jp').trim().toLowerCase();
  const resolved = DC_MAP[dc];
  if (!resolved) {
    throw new Error(`unsupported_dc:${dc}`);
  }

  if (!ALLOWED_API_HOSTS.has(resolved.apiHost)) {
    throw new Error(`disallowed_api_host:${resolved.apiHost}`);
  }

  const orgId = env.ZOHO_ENV === 'sandbox'
    ? env.ZOHO_ORG_ID_SANDBOX
    : (env.ZOHO_ORG_ID || env.ZOHO_ORG_ID_PRODUCTION);

  return {
    dc,
    orgId,
    accountsBaseUrl: `https://${resolved.accountsHost}`,
    crmApiBaseUrl: `https://${resolved.apiHost}/crm/v8`,
    apiHost: resolved.apiHost,
  };
}

export function resolveMode(value = process.env.ZOHO_MODE || process.env.ZOHO_CRM_MODE) {
  return value === 'apply' ? 'apply' : 'dry_run';
}

export function wrapCrmData(payload) {
  if (payload == null) return undefined;
  if (Array.isArray(payload)) return { data: payload };
  if (typeof payload === 'object' && Array.isArray(payload.data)) return payload;
  if (typeof payload === 'object') return { data: [payload] };
  throw new Error('invalid_payload_type');
}

export function sanitizeForLog(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const normalized = key.toLowerCase();
      if (
        normalized.includes('token')
        || normalized.includes('secret')
        || normalized === 'authorization'
        || normalized === 'client_id'
        || normalized === 'client_secret'
      ) {
        return [key, '[redacted]'];
      }
      return [key, sanitizeForLog(entry)];
    }),
  );
}

function normalizeCrmPath(path) {
  if (!path || typeof path !== 'string') throw new Error('crm_path_required');
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    if (!ALLOWED_API_HOSTS.has(url.host)) {
      throw new Error(`disallowed_api_host:${url.host}`);
    }
    if (!url.pathname.startsWith('/crm/v8/')) {
      throw new Error(`unsupported_crm_path:${url.pathname}`);
    }
    return `${url.pathname}${url.search}`;
  }

  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.startsWith('/crm/v8/') ? withSlash : `/crm/v8${withSlash}`;
}

function endpointLabel(method, crmPath) {
  return `${method.toUpperCase()} ${crmPath}`;
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function zohoBodyHasError(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.error || (typeof body.code === 'string' && body.code !== 'SUCCESS')) return true;
  if (Array.isArray(body.data)) {
    return body.data.some((row) => row && typeof row === 'object' && row.code && row.code !== 'SUCCESS');
  }
  return false;
}

export class ZohoCrmDryRunClient {
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.mode = resolveMode(options.mode);
    this.scope = options.scope || 'ZohoCRM.modules.ALL,ZohoCRM.settings.modules.READ';
    this.environment = resolveZohoCrmEnvironment(this.env);
    this.token = null;
  }

  assertCredentialsAvailable() {
    const missing = [];
    if (!this.env.ZOHO_CLIENT_ID) missing.push('ZOHO_CLIENT_ID');
    if (!this.env.ZOHO_CLIENT_SECRET) missing.push('ZOHO_CLIENT_SECRET');
    if (!this.environment.orgId) missing.push(this.env.ZOHO_ENV === 'sandbox' ? 'ZOHO_ORG_ID_SANDBOX' : 'ZOHO_ORG_ID');
    if (missing.length) {
      throw new Error(`missing_env:${missing.join(',')}`);
    }
  }

  async getToken() {
    if (this.token) return this.token;
    this.assertCredentialsAvailable();

    const params = new URLSearchParams({
      client_id: this.env.ZOHO_CLIENT_ID,
      client_secret: this.env.ZOHO_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: this.scope,
      soid: `ZohoCRM.${this.environment.orgId}`,
    });

    const res = await fetch(`${this.environment.accountsBaseUrl}/oauth/v2/token`, {
      method: 'POST',
      body: params,
    });
    const body = await parseJsonResponse(res);
    if (!res.ok || body.error || !body.access_token) {
      throw new Error(`token_failed:${JSON.stringify(sanitizeForLog(body))}`);
    }

    this.token = body.access_token;
    return this.token;
  }

  async request(method, path, options = {}) {
    const upperMethod = method.toUpperCase();
    const crmPath = normalizeCrmPath(path);
    const isWrite = WRITE_METHODS.has(upperMethod);
    const wrappedPayload = options.rawPayload === true ? options.payload : wrapCrmData(options.payload);
    const requestInfo = {
      method: upperMethod,
      endpoint: endpointLabel(upperMethod, crmPath),
      api_host: this.environment.apiHost,
      payload: wrappedPayload,
    };

    if (isWrite && this.mode !== 'apply') {
      return {
        ok: true,
        mode: this.mode,
        skipped: true,
        reason: 'dry_run_write_blocked',
        request: requestInfo,
      };
    }

    const token = await this.getToken();
    const res = await fetch(`${this.environment.crmApiBaseUrl}${crmPath.replace('/crm/v8', '')}`, {
      method: upperMethod,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: wrappedPayload ? JSON.stringify(wrappedPayload) : undefined,
    });
    const body = await parseJsonResponse(res);
    const ok = res.ok && !zohoBodyHasError(body);

    return {
      ok,
      mode: this.mode,
      skipped: false,
      request: { ...requestInfo, payload: wrappedPayload },
      response: {
        http_status: res.status,
        body: sanitizeForLog(body),
      },
    };
  }

  get(path, options = {}) {
    return this.request('GET', path, options);
  }

  post(path, payload, options = {}) {
    return this.request('POST', path, { ...options, payload });
  }

  put(path, payload, options = {}) {
    return this.request('PUT', path, { ...options, payload });
  }

  patch(path, payload, options = {}) {
    return this.request('PATCH', path, { ...options, payload });
  }

  delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }
}
