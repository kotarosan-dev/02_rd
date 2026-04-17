/**
 * Deluge 関数の実行 (test/execute) と、結果の正規化。
 *
 * 内部 API:
 *   POST /crm/v9/settings/functions/<api_name>/actions/test
 *   Content-Type: application/json; charset=UTF-8
 *   Body: {"functions":[{"script":<wrapped>, "arguments":{...}}]}
 *
 * レスポンスは success / failure の 2 系統。
 *   success: { status, output, metrics, logs:[{line_number,category,value,...}] }
 *   failure: { status:"failure", error:{type,line_number,message,function_name}, logs:null }
 */
import type { ZohoInternalClient } from "../client/zohoClient.js";

export interface ExecLog {
  line_number: number;
  function_name: string;
  data_type?: string;
  time?: string;
  category: "info" | "error" | string;
  value: string;
}

export interface ExecError {
  type: string; // "RUNTIME_ERROR" など
  line_number: number;
  function_name: string;
  message: string;
}

export interface ExecMetrics {
  statements_executed: number;
  webhook: number;
  time_taken_in_ms: number;
  integration_task: number;
  send_mail: number;
  send_sms: number;
}

export interface ExecResult {
  ok: boolean;
  apiName: string;
  status: "success" | "failure" | string;
  output: unknown;
  metrics: ExecMetrics | null;
  logs: ExecLog[];
  error: ExecError | null;
  raw: unknown;
}

interface FunctionRow {
  id: string;
  name?: string;
  api_name?: string;
}

/** 関数 api_name から id を解決する */
export async function resolveFunctionId(
  client: ZohoInternalClient,
  apiName: string
): Promise<string | null> {
  const list = await client.request("GET", "/crm/v2/settings/functions", {
    params: { type: "org", start: "1", limit: "200" },
  });
  const rows =
    ((list?.data as { functions?: FunctionRow[] })?.functions ?? []);
  const hit = rows.find((f) => f.name === apiName || f.api_name === apiName);
  return hit?.id ?? null;
}

/** 関数の wrapped script を取得する */
export async function getWrappedScript(
  client: ZohoInternalClient,
  id: string
): Promise<{ apiName: string; script: string } | null> {
  const det = await client.request("GET", `/crm/v2/settings/functions/${id}`, {
    params: { source: "crm" },
  });
  const fn = (det?.data as {
    functions?: Array<{ script?: string; api_name?: string; name?: string }>;
  })?.functions?.[0];
  if (!fn?.script) return null;
  return { apiName: fn.api_name ?? fn.name ?? "", script: fn.script };
}

/** 関数を実行し、結果を正規化して返す */
export async function execFunction(
  client: ZohoInternalClient,
  apiName: string,
  args: Record<string, unknown> = {},
  opts: { capture?: boolean; tag?: string } = {}
): Promise<ExecResult> {
  const id = await resolveFunctionId(client, apiName);
  if (!id) {
    throw new Error(`function api_name=${apiName} not found in org`);
  }
  const wrapped = await getWrappedScript(client, id);
  if (!wrapped) {
    throw new Error(`could not fetch wrapped script for ${apiName} (id=${id})`);
  }

  const body = JSON.stringify({
    functions: [{ script: wrapped.script, arguments: args }],
  });
  const res = await client.request(
    "POST",
    `/crm/v9/settings/functions/${wrapped.apiName}/actions/test`,
    {
      rawBody: body,
      contentType: "application/json; charset=UTF-8",
      capture: opts.capture ?? true,
      tag: opts.tag ?? `exec-${wrapped.apiName}`,
    }
  );

  const fn = (res?.data as {
    functions?: Array<{
      status?: string;
      output?: unknown;
      metrics?: ExecMetrics | null;
      logs?: ExecLog[] | null;
      error?: ExecError | null;
    }>;
  })?.functions?.[0];

  return {
    ok: fn?.status === "success",
    apiName: wrapped.apiName,
    status: fn?.status ?? "unknown",
    output: fn?.output ?? null,
    metrics: fn?.metrics ?? null,
    logs: fn?.logs ?? [],
    error: fn?.error ?? null,
    raw: res?.data,
  };
}
