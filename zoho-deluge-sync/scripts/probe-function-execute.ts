/**
 * Phase 2.1: 関数実行 (execute) 内部 API probe。
 *
 * 標準 REST 公開 API:
 *   POST /crm/v7/functions/<api_name>/actions/execute?auth_type=apikey&zapikey=...
 *   ただし list レスポンスの rest_api[].active は false → 事前に UI で有効化が必要
 *
 * このスクリプトは内部 API 経由（Cookie + CSRF）で実行する経路を試す。
 * 候補:
 *   E1. POST /crm/v2/settings/functions/<id>/execute?source=crm
 *   E2. POST /crm/v2/settings/functions/<id>/execute?language=deluge
 *   E3. POST /crm/v2/settings/functions/<id>/actions/execute
 *   E4. POST /crm/v2/settings/functions/<id>/run?source=crm
 *   E5. POST /crm/v2/settings/functions/<id>/test?source=crm
 *
 * 実行: pnpm dotenvx run -- tsx scripts/probe-function-execute.ts
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const TARGET_ID = process.env.PROBE_FUNCTION_ID ?? "2445000000056007"; // thisistest

interface Probe {
  label: string;
  method: "POST" | "GET" | "PUT";
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  contentType?: string;
}

const probes: Probe[] = [
  { label: "E6_PUT_execute_lang", method: "PUT", path: `/crm/v2/settings/functions/${TARGET_ID}/execute`, params: { language: "deluge" }, body: {} },
  { label: "E7_GET_execute_source", method: "GET", path: `/crm/v2/settings/functions/${TARGET_ID}/execute`, params: { source: "crm" } },
  { label: "E8_GET_execute_lang", method: "GET", path: `/crm/v2/settings/functions/${TARGET_ID}/execute`, params: { language: "deluge" } },
  { label: "E9_GET_run_source", method: "GET", path: `/crm/v2/settings/functions/${TARGET_ID}/run`, params: { source: "crm" } },
  { label: "E10_GET_test_source", method: "GET", path: `/crm/v2/settings/functions/${TARGET_ID}/test`, params: { source: "crm" } },
  // 「Save & Execute」相当: update body を /execute に送る
  { label: "E11_PUT_execute_with_body", method: "PUT", path: `/crm/v2/settings/functions/${TARGET_ID}/execute`, params: { language: "deluge" }, body: { functions: [{ name: "thisistest", display_name: "thisi is test", description: "", return_type: "void", params: [], workflow: "\nthisistest = zoho.loginuserid;\n", commit_message: "execute test" }] } },
];

async function main() {
  const client = createZohoClientFromEnv({ allowProdWrite: true });
  console.log(`Target id = ${TARGET_ID}\n`);

  for (const p of probes) {
    const rawBody = p.body !== undefined ? JSON.stringify(p.body) : undefined;
    console.log(`>>> ${p.label}  ${p.method} ${p.path}  params=${JSON.stringify(p.params ?? {})}`);
    const res = await client.request(p.method, p.path, {
      params: p.params,
      rawBody,
      contentType: rawBody ? (p.contentType ?? "application/json; charset=UTF-8") : undefined,
      capture: true,
      tag: `exec-${p.label}`,
    });
    if (!res) continue;
    const preview = typeof res.data === "string" ? String(res.data).slice(0, 250) : JSON.stringify(res.data).slice(0, 250);
    console.log(`    HTTP ${res.status}  ${preview}\n`);
    await new Promise((r) => setTimeout(r, 400));
  }
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
