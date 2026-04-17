/**
 * Deluge 関数の削除。
 *
 * 内部 API:
 *   DELETE /crm/v2/settings/functions/<id>
 *   （クエリ無し or ?source=crm。最初に通った形を使う）
 */
import type { ZohoInternalClient } from "../client/zohoClient.js";
import { resolveFunctionId } from "./exec.js";

export async function deleteFunction(
  client: ZohoInternalClient,
  apiName: string
): Promise<{ id: string; raw: unknown }> {
  const id = await resolveFunctionId(client, apiName);
  if (!id) throw new Error(`function api_name=${apiName} not found`);

  // パターンを順に試して最初に 200 を返したものを採用
  const attempts: Array<{ label: string; params?: Record<string, string> }> = [
    { label: "no-query" },
    { label: "source-crm", params: { source: "crm" } },
    { label: "language-deluge", params: { language: "deluge" } },
    { label: "type-org", params: { type: "org" } },
  ];

  for (const a of attempts) {
    const res = await client.request("DELETE", `/crm/v2/settings/functions/${id}`, {
      params: a.params,
      capture: true,
      tag: `delete-${apiName}-${a.label}`,
    });
    if (res?.status === 200) {
      return { id, raw: res.data };
    }
    // 405/404 等なら次のパラメータを試す
  }
  throw new Error(`delete failed for ${apiName} (id=${id}): no attempt returned 200`);
}
