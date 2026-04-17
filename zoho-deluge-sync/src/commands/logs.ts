/**
 * 関数の実行履歴 (logs) を取得する。
 *
 * 内部 API:
 *   GET /crm/v2.2/settings/functions/<id>/logs?period=past_24_hours&page=1&per_page=40&language=deluge
 *   GET /crm/v2.2/settings/functions/<id>/logs/<log_id>?period=custom&start_datetime=...&end_datetime=...
 *
 * 1 件目はサマリー一覧、2 件目は個別実行の詳細（statements, info logs など）。
 */
import type { ZohoInternalClient } from "../client/zohoClient.js";
import { resolveFunctionId } from "./exec.js";

export interface LogSummary {
  id: string;
  function_name: string;
  component_type: string;
  executed_time: string; // "2026/04/17 17:31"
  status: "success" | "failure" | string;
  execution_time: number; // ms
}

export interface LogListResult {
  apiName: string;
  page: number;
  per_page: number;
  more: boolean;
  total: number;
  items: LogSummary[];
  raw: unknown;
}

export interface ListLogsOptions {
  period?: "past_24_hours" | "past_7_days" | "past_30_days" | "today" | string;
  page?: number;
  perPage?: number;
  capture?: boolean;
}

export async function listLogs(
  client: ZohoInternalClient,
  apiName: string,
  opts: ListLogsOptions = {}
): Promise<LogListResult> {
  const id = await resolveFunctionId(client, apiName);
  if (!id) throw new Error(`function api_name=${apiName} not found`);

  const res = await client.request(
    "GET",
    `/crm/v2.2/settings/functions/${id}/logs`,
    {
      params: {
        period: opts.period ?? "past_24_hours",
        page: String(opts.page ?? 1),
        per_page: String(opts.perPage ?? 40),
        language: "deluge",
      },
      capture: opts.capture ?? false,
      tag: `logs-list-${apiName}`,
    }
  );
  const data = (res?.data as {
    function_logs?: LogSummary[];
    info?: { page?: number; per_page?: number; more_records?: boolean; count?: number };
  }) ?? {};
  return {
    apiName,
    page: data.info?.page ?? 1,
    per_page: data.info?.per_page ?? 40,
    more: data.info?.more_records ?? false,
    total: data.info?.count ?? data.function_logs?.length ?? 0,
    items: data.function_logs ?? [],
    raw: res?.data,
  };
}

export async function getLogDetail(
  client: ZohoInternalClient,
  apiName: string,
  logId: string,
  range?: { startIso: string; endIso: string }
) {
  const id = await resolveFunctionId(client, apiName);
  if (!id) throw new Error(`function api_name=${apiName} not found`);

  const params: Record<string, string> = {};
  if (range) {
    params.period = "custom";
    params.start_datetime = range.startIso;
    params.end_datetime = range.endIso;
  }
  const res = await client.request(
    "GET",
    `/crm/v2.2/settings/functions/${id}/logs/${logId}`,
    { params, capture: true, tag: `logs-detail-${apiName}-${logId}` }
  );
  return res?.data;
}
