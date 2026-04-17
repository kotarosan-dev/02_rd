/**
 * Phase 2.2: 関数実行 (test/execute)
 * HAR から確定:
 *   POST /crm/v9/settings/functions/<api_name>/actions/test
 *   Content-Type: application/json; charset=UTF-8
 *   Body: {"functions":[{"script":"<full wrapped>", "arguments":{...}}]}
 *
 * 引数:
 *   FUNCTION_NAME  : 対象関数の api_name (default: thisistest)
 *   FUNCTION_ARGS  : JSON 文字列  (default: {})
 *
 * 例: $env:FUNCTION_NAME="thisistest"; $env:FUNCTION_ARGS='{"demo":"hello"}'; pnpm dotenvx run -- tsx scripts/execute-function.ts
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

async function main() {
  const apiName = process.env.FUNCTION_NAME ?? "thisistest";
  const args: Record<string, unknown> = process.env.FUNCTION_ARGS
    ? JSON.parse(process.env.FUNCTION_ARGS)
    : {};

  const client = createZohoClientFromEnv({ allowProdWrite: true });

  // 1) list → api_name 一致で id 解決
  const list = await client.request("GET", "/crm/v2/settings/functions", {
    params: { type: "org", start: "1", limit: "200", language: "deluge" },
  });
  const arr = (list?.data as { functions?: Array<{ id: string; name: string }> })?.functions ?? [];
  const hit = arr.find((f) => f.name === apiName);
  if (!hit) {
    console.error(`function api_name=${apiName} not found`);
    process.exit(1);
  }
  const detail = await client.request("GET", `/crm/v2/settings/functions/${hit.id}`, {
    params: { category: "automation", language: "deluge", source: "crm" },
  });
  const script = (detail?.data as { functions?: Array<{ script?: string }> })?.functions?.[0]?.script;

  if (!script) {
    console.error("could not resolve script body");
    process.exit(1);
  }
  console.log("--- script ---\n" + script + "\n--------------\n");

  // 2) test/execute を呼ぶ
  const body = JSON.stringify({
    functions: [
      {
        script,
        arguments: args,
      },
    ],
  });

  console.log(`>>> POST /crm/v9/settings/functions/${apiName}/actions/test`);
  console.log(`    arguments = ${JSON.stringify(args)}`);

  const res = await client.request("POST", `/crm/v9/settings/functions/${apiName}/actions/test`, {
    rawBody: body,
    contentType: "application/json; charset=UTF-8",
    capture: true,
    tag: `execute-${apiName}`,
  });
  if (!res) return;

  console.log(`\n=== HTTP ${res.status} ===`);
  console.log(JSON.stringify(res.data, null, 2));
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
