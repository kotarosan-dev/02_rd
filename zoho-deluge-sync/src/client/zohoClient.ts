import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface ZohoClientConfig {
  baseUrl: string;
  cookie: string;
  csrfToken: string; // "crmcsrfparam=..." の形式
  orgId: string;
  /** dry-run / capture を保存するルート。既定 = process.cwd()/docs */
  docsDir?: string;
  /** 本番書き込みを許可するか。default false */
  allowProdWrite?: boolean;
}

export interface CallOptions {
  /** true のとき HTTP は飛ばさず、送信予定 request を docs/dry-runs に保存して null を返す */
  dryRun?: boolean;
  /** レスポンスを docs/request-captures に保存するか */
  capture?: boolean;
  /** capture / dry-run のファイル名タグ（resource-verb 等） */
  tag?: string;
}

/** 機微情報をマスクして表示するためのヘルパ */
function maskHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = { ...headers };
  for (const k of Object.keys(masked)) {
    const lk = k.toLowerCase();
    if (lk === "cookie" || lk === "x-zcsrf-token") {
      const v = String(masked[k] ?? "");
      masked[k] = v.length > 12 ? `${v.slice(0, 8)}...(${v.length} chars)` : "***";
    }
  }
  return masked;
}

/**
 * レスポンス body から漏洩リスクのあるトークンをマスクする。
 * - `zapikey=<token>` (Zoho の API キー)
 * - `auth_type=oauth` の URL 等は構造として残してよい
 * 文字列内をシンプルに置換する素朴な実装。
 */
function maskSensitiveInData<T>(data: T): T {
  const json = JSON.stringify(data);
  if (!json) return data;
  const masked = json
    // zapikey=xxxxx... を zapikey=***MASKED*** に
    .replace(/zapikey=[A-Za-z0-9._\-]+/g, "zapikey=***MASKED***")
    // 念のため OAuth bearer token らしきもの
    .replace(/Bearer\s+[A-Za-z0-9._\-]{20,}/g, "Bearer ***MASKED***");
  if (masked === json) return data;
  return JSON.parse(masked) as T;
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(p: string) {
  mkdirSync(dirname(p), { recursive: true });
}

export class ZohoInternalClient {
  private readonly http: AxiosInstance;
  private readonly docsDir: string;
  private readonly allowProdWrite: boolean;

  constructor(private readonly cfg: ZohoClientConfig) {
    this.docsDir = resolve(cfg.docsDir ?? join(process.cwd(), "docs"));
    this.allowProdWrite = cfg.allowProdWrite ?? false;

    this.http = axios.create({
      baseURL: cfg.baseUrl,
      timeout: 30_000,
      // 4xx/5xx でも throw せず response を返してもらう（呼び出し側で詳細ログ取りたい）
      validateStatus: () => true,
      headers: {
        Accept: "*/*",
        "Accept-Language": "ja",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
        Referer: `${cfg.baseUrl}/`,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cfg.cookie,
        "X-ZCSRF-TOKEN": cfg.csrfToken,
        "X-CRM-ORG": cfg.orgId,
      },
    });
  }

  /** 任意の内部 API を叩く低レベル API */
  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      headers?: Record<string, string>;
      /** body を文字列化済みで送りたいとき（text/plain で JSON を送る等） */
      rawBody?: string;
      /** transformRequest をスキップして body をそのまま送る */
      contentType?: string;
    } & CallOptions = {},
  ): Promise<AxiosResponse<T> | null> {
    const isWrite = method !== "GET";
    const tag = options.tag ?? `${method.toLowerCase()}-${path.replace(/[^a-z0-9]+/gi, "-")}`;

    const mergedHeaders: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.contentType) mergedHeaders["Content-Type"] = options.contentType;

    const reqConfig: AxiosRequestConfig = {
      method,
      url: path,
      params: options.params,
      data: options.rawBody !== undefined ? options.rawBody : options.body,
      headers: mergedHeaders,
      // rawBody を渡された場合 axios が JSON.stringify してしまわないように
      transformRequest: options.rawBody !== undefined ? [(d) => d] : undefined,
    };

    // --- Dry-run 分岐 ---
    if (options.dryRun) {
      const out = join(this.docsDir, "dry-runs", `${nowStamp()}-${tag}.json`);
      ensureDir(out);
      writeFileSync(
        out,
        JSON.stringify(
          {
            method,
            url: `${this.cfg.baseUrl}${path}`,
            params: options.params ?? null,
            body: options.body ?? null,
            headers: maskHeaders({
              ...this.http.defaults.headers.common,
              ...(options.headers ?? {}),
            }),
            note: "dry-run: this request was NOT sent",
          },
          null,
          2,
        ),
        "utf8",
      );
      // eslint-disable-next-line no-console
      console.log(`[dry-run] ${method} ${path} -> saved request to ${out}`);
      return null;
    }

    // --- 本番書き込みガード ---
    if (isWrite && !this.allowProdWrite) {
      throw new Error(
        `[zoho-client] write operation (${method} ${path}) blocked. ` +
          `Set allowProdWrite=true (or ZOHO_ALLOW_PROD_WRITE=1) to enable.`,
      );
    }

    const res = await this.http.request<T>(reqConfig);

    if (options.capture) {
      const out = join(this.docsDir, "request-captures", `${nowStamp()}-${tag}.json`);
      ensureDir(out);
      writeFileSync(
        out,
        JSON.stringify(
          {
            request: {
              method,
              url: `${this.cfg.baseUrl}${path}`,
              params: options.params ?? null,
              body: options.body ?? null,
              headers: maskHeaders({
                ...this.http.defaults.headers.common,
                ...(options.headers ?? {}),
              }),
            },
            response: {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers,
              data: maskSensitiveInData(res.data),
            },
          },
          null,
          2,
        ),
        "utf8",
      );
      // eslint-disable-next-line no-console
      console.log(
        `[capture] ${method} ${path} -> ${res.status} (${out})`,
      );
    }

    return res;
  }

  // ------------------------------------------------------------------
  // 高レベル API
  // ------------------------------------------------------------------

  /** Functions 一覧。pagination 付き */
  async listFunctions(opts: {
    type?: "org" | "module" | "deluge" | string;
    start?: number;
    limit?: number;
    capture?: boolean;
  } = {}) {
    const { type = "org", start = 1, limit = 50, capture = false } = opts;
    return this.request("GET", "/crm/v2/settings/functions", {
      params: { type, start, limit },
      capture,
      tag: `functions-list-${type}`,
    });
  }

  /** 個別関数の取得。`source` などを含む完全な情報を取りたいときに使う候補 */
  async getFunction(id: string, opts: { capture?: boolean; category?: string } = {}) {
    return this.request("GET", `/crm/v2/settings/functions/${encodeURIComponent(id)}`, {
      params: opts.category ? { category: opts.category } : undefined,
      capture: opts.capture,
      tag: `function-get-${id}`,
    });
  }

  /** 個別関数のスクリプト（Deluge 本体）取得。/script サフィックスで取れる可能性を試す */
  async getFunctionScript(id: string, opts: { capture?: boolean; category?: string } = {}) {
    return this.request("GET", `/crm/v2/settings/functions/${encodeURIComponent(id)}/script`, {
      params: opts.category ? { category: opts.category } : undefined,
      capture: opts.capture,
      tag: `function-script-${id}`,
    });
  }
}

/** .env から ZohoInternalClient を生成 */
export function createZohoClientFromEnv(overrides: Partial<ZohoClientConfig> = {}): ZohoInternalClient {
  const baseUrl = process.env.ZOHO_BASE_URL;
  const cookie = process.env.ZOHO_COOKIE;
  const csrfToken = process.env.ZOHO_CSRF_TOKEN;
  const orgId = process.env.ZOHO_ORG_ID;
  const allowProdWrite = process.env.ZOHO_ALLOW_PROD_WRITE === "1";

  const missing = (
    [
      ["ZOHO_BASE_URL", baseUrl],
      ["ZOHO_COOKIE", cookie],
      ["ZOHO_CSRF_TOKEN", csrfToken],
      ["ZOHO_ORG_ID", orgId],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `[zoho-client] missing env vars: ${missing.join(", ")}. ` +
        `Run \`pnpm dotenvx set <KEY> <VALUE>\` or copy .env.example to .env.`,
    );
  }

  return new ZohoInternalClient({
    baseUrl: baseUrl!,
    cookie: cookie!,
    csrfToken: csrfToken!,
    orgId: orgId!,
    allowProdWrite,
    ...overrides,
  });
}
