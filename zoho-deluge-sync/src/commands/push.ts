/**
 * .dg ファイルを Deluge 関数として PUT (update) する。
 *
 * 内部 API（HAR 09 で確定）:
 *   PUT /crm/v2/settings/functions/<id>?language=deluge
 *   Content-Type: text/plain;charset=UTF-8
 *   Body (flat):
 *     {"functions":[{display_name,description,name,return_type,params,workflow,commit_message}]}
 *
 * workflow フィールドには「ラップなしの body」をそのまま入れる。
 *
 * エラーケース:
 *   400 INVALID_DATA + details.errorMessage(構文エラー) → SyntaxPushError として throw
 */
import type { ZohoInternalClient } from "../client/zohoClient.js";
import type { DgFile } from "./dgfile.js";
import { resolveFunctionId } from "./exec.js";

export interface PushSyntaxError {
  kind: "syntax";
  apiName: string;
  message: string;
  lineNumber: number;
  charPosition?: number;
  raw: unknown;
}

export interface PushOk {
  kind: "ok";
  apiName: string;
  id: string;
  raw: unknown;
}

export type PushResult = PushOk | PushSyntaxError;

/** body を workflow フィールド用に正規化（先頭に改行とインデント） */
function normalizeWorkflow(body: string): string {
  const lines = body.split(/\r?\n/);
  return "\n" + lines.map((l) => "\t" + l).join("\n") + "\n";
}

export async function pushFunction(
  client: ZohoInternalClient,
  dg: DgFile,
  opts: { commitMessage?: string; capture?: boolean } = {}
): Promise<PushResult> {
  const id = await resolveFunctionId(client, dg.apiName);
  if (!id) {
    throw new Error(
      `function api_name=${dg.apiName} not found in org (create it first via UI or 'pnpm run create')`
    );
  }
  const body = JSON.stringify({
    functions: [
      {
        display_name: dg.apiName,
        description: "",
        name: dg.apiName,
        return_type: dg.returnType,
        params: dg.params,
        workflow: normalizeWorkflow(dg.body),
        commit_message: opts.commitMessage ?? `pushed by zoho-deluge-sync`,
      },
    ],
  });
  const res = await client.request("PUT", `/crm/v2/settings/functions/${id}`, {
    params: { language: "deluge" },
    rawBody: body,
    contentType: "text/plain;charset=UTF-8",
    capture: opts.capture ?? false,
    tag: `push-${dg.apiName}`,
  });

  if (res?.status === 400) {
    const data = res.data as {
      details?: { errorMessage?: string; lineNumber?: number; charPositionInLine?: number };
      message?: string;
    };
    return {
      kind: "syntax",
      apiName: dg.apiName,
      message: data.details?.errorMessage ?? data.message ?? "syntax error",
      lineNumber: data.details?.lineNumber ?? 0,
      charPosition: data.details?.charPositionInLine,
      raw: res.data,
    };
  }
  if (res?.status === 200) {
    return { kind: "ok", apiName: dg.apiName, id, raw: res.data };
  }
  throw new Error(
    `push failed: HTTP ${res?.status} ${JSON.stringify(res?.data).slice(0, 300)}`
  );
}
