/**
 * Deluge 関数の新規作成 (stub)。
 *
 * 内部 API（bootstrap-aitest-ping で確定）:
 *   POST /crm/v2/settings/functions?language=deluge
 *   Content-Type: application/json; charset=UTF-8
 *   Body (flat):
 *     {"functions":[{"name","display_name","description","return_type","params","category":"automation"}]}
 *
 * 作成直後は body が空なので、続けて push (PUT) で workflow を入れる前提。
 */
import type { ZohoInternalClient } from "../client/zohoClient.js";
import type { DgParam } from "./dgfile.js";
import { resolveFunctionId } from "./exec.js";

export interface CreateOptions {
  apiName: string;
  displayName?: string;
  description?: string;
  returnType?: string;
  params?: DgParam[];
}

export async function createFunction(
  client: ZohoInternalClient,
  opts: CreateOptions
): Promise<{ id: string; apiName: string; raw: unknown }> {
  // 既存チェック
  const existing = await resolveFunctionId(client, opts.apiName);
  if (existing) {
    throw new Error(
      `function api_name=${opts.apiName} already exists (id=${existing})`
    );
  }

  const body = JSON.stringify({
    functions: [
      {
        name: opts.apiName,
        display_name: opts.displayName ?? opts.apiName,
        description: opts.description ?? "",
        return_type: opts.returnType ?? "void",
        params: opts.params ?? [],
        category: "automation",
      },
    ],
  });
  const res = await client.request("POST", "/crm/v2/settings/functions", {
    params: { language: "deluge" },
    rawBody: body,
    contentType: "application/json; charset=UTF-8",
    capture: true,
    tag: `create-${opts.apiName}`,
  });
  if (res?.status !== 200) {
    throw new Error(
      `create failed: HTTP ${res?.status} ${JSON.stringify(res?.data).slice(0, 300)}`
    );
  }
  const fn = (res.data as {
    functions?: Array<{ status?: string; details?: { id?: string; api_name?: string; name?: string } }>;
  })?.functions?.[0];
  if (fn?.status !== "success" || !fn.details?.id) {
    throw new Error(`create returned unexpected payload: ${JSON.stringify(res.data)}`);
  }
  // Zoho は先頭 _ を剥がす等の正規化を行うので、サーバが返した値を信頼する
  const actualApiName = fn.details.api_name ?? fn.details.name ?? opts.apiName;
  if (actualApiName !== opts.apiName) {
    console.warn(
      `[warn] requested api_name=${opts.apiName} was normalized to '${actualApiName}' by Zoho`
    );
  }
  return { id: fn.details.id, apiName: actualApiName, raw: res.data };
}
