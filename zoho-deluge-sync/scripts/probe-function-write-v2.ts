/**
 * Phase 1.7: 書き込み verb / body の発見 probe（v2、HAR 反映後）。
 *
 * 判明した正解パターン:
 *   PUT /crm/v2/settings/functions/<id>?language=deluge
 *   Content-Type: text/plain;charset=UTF-8
 *   body (JSON, but sent as text/plain):
 *     {"functions":[{"details":{"name":"...","description":null,"display_name":"...","script":"..."}}]}
 *
 * 戦略: thisistest を「同じ内容で書き戻す」だけ → 実質ノーオペで verb/body を verify。
 * 期待 response: {"functions":[{"details":{...},"message":"function updated successfully","status":"success"}]}
 *
 * 実行:
 *   $env:DRY_RUN="1"; pnpm dotenvx run -- tsx scripts/probe-function-write-v2.ts   # dry-run
 *   pnpm dotenvx run -- tsx scripts/probe-function-write-v2.ts                     # live
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const TARGET_ID = process.env.PROBE_FUNCTION_ID ?? "2445000000056007"; // thisistest
const isDryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

async function main() {
  const client = createZohoClientFromEnv({ allowProdWrite: true });

  console.log(`Step 1: GET current state of ${TARGET_ID} ...`);
  const cur = await client.request("GET", `/crm/v2/settings/functions/${TARGET_ID}`, {
    params: { source: "crm" },
  });
  if (!cur || cur.status !== 200) {
    console.error("failed to fetch current. abort.");
    process.exit(1);
  }
  const data = cur.data as { functions?: Array<Record<string, unknown>> };
  const rec = data.functions?.[0];
  if (!rec) {
    console.error("no function record. abort.");
    process.exit(1);
  }

  const body = {
    functions: [
      {
        details: {
          name: rec.name ?? rec.api_name,
          description: rec.description ?? null,
          display_name: rec.display_name,
          script: rec.script,
        },
      },
    ],
  };
  const rawBody = JSON.stringify(body);
  console.log(`Step 2: PUT same content back (Content-Length=${rawBody.length}, dry-run=${isDryRun})`);
  console.log(`  body = ${rawBody}`);

  const res = await client.request("PUT", `/crm/v2/settings/functions/${TARGET_ID}`, {
    params: { language: "deluge" },
    rawBody,
    contentType: "text/plain;charset=UTF-8",
    capture: !isDryRun,
    dryRun: isDryRun,
    tag: "write-v2-PUT-language-deluge",
  });

  if (!res) {
    console.log("dry-run: see docs/dry-runs/ for outgoing request.");
    return;
  }

  console.log(`\nHTTP ${res.status}`);
  console.log(JSON.stringify(res.data, null, 2));

  const responseData = res.data as {
    functions?: Array<{ status?: string; message?: string }>;
  };
  const ok =
    res.status === 200 && responseData.functions?.[0]?.status === "success";
  if (ok) {
    console.log("\n*** WRITE PROBE PASSED ***");
    console.log("verb=PUT, query=?language=deluge, content-type=text/plain, body=details-wrapped JSON");
  } else {
    console.error("\n!!! WRITE PROBE FAILED !!!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
