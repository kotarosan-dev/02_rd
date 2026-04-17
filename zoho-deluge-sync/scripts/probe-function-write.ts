/**
 * Phase 1.6: 書き込み verb / path の発見 probe。
 *
 * 戦略: 「同じ内容で書き戻すだけ」を複数 verb で試し、200 が返る組み合わせを発見する。
 *       実質ノーオペなのでレコードは変わらない（updatedTime は変わるかも）。
 *
 * 試すパターン:
 *   W1. PUT  /crm/v2/settings/functions/<id>?source=crm   body: { functions: [<full record>] }
 *   W2. POST /crm/v2/settings/functions/<id>?source=crm   body: { functions: [<full record>] }
 *   W3. PUT  /crm/v2/settings/functions/<id>?source=crm   body: <full record>
 *   W4. PUT  /crm/v2/settings/functions?source=crm        body: { functions: [<full record with id>] }
 *
 * 実行:
 *   pnpm dotenvx run -- tsx scripts/probe-function-write.ts --dry-run     # まず dry-run で確認
 *   ZOHO_ALLOW_PROD_WRITE=1 pnpm dotenvx run -- tsx scripts/probe-function-write.ts   # 実行
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const TARGET_ID = process.env.PROBE_FUNCTION_ID ?? "2445000000056007"; // thisistest
const isDryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

async function main() {
  const client = createZohoClientFromEnv({ allowProdWrite: true }); // probe 用に強制有効化

  // 1. 現状を取得
  console.log(`Step 1: fetching current state of ${TARGET_ID} ...`);
  const current = await client.request("GET", `/crm/v2/settings/functions/${TARGET_ID}`, {
    params: { source: "crm" },
    capture: false,
  });
  if (!current || current.status !== 200) {
    console.error("failed to fetch current. abort.");
    process.exit(1);
  }
  const data = current.data as { functions?: Array<Record<string, unknown>> };
  const record = data.functions?.[0];
  if (!record) {
    console.error("no function record returned. abort.");
    process.exit(1);
  }

  console.log(`current script:\n${record.script}\n---`);
  console.log(`Step 2: probing write verbs (dry-run=${isDryRun}) ...`);

  const onlyLabel = process.env.PROBE_ONLY; // 1 個だけ試したいときに指定
  const allProbes: Array<{
    label: string;
    method: "PUT" | "POST";
    path: string;
    body: unknown;
  }> = [
    {
      label: "W1_PUT_id_wrapped",
      method: "PUT",
      path: `/crm/v2/settings/functions/${TARGET_ID}`,
      body: { functions: [record] },
    },
    {
      label: "W2_POST_id_wrapped",
      method: "POST",
      path: `/crm/v2/settings/functions/${TARGET_ID}`,
      body: { functions: [record] },
    },
    {
      label: "W3_PUT_id_unwrapped",
      method: "PUT",
      path: `/crm/v2/settings/functions/${TARGET_ID}`,
      body: record,
    },
    // W4 (PUT collection) はコレクション全体置換のリスクがあるため probe 対象から外す
  ];
  const probes = onlyLabel ? allProbes.filter((p) => p.label === onlyLabel) : allProbes;
  console.log(`probes to run: ${probes.map((p) => p.label).join(", ")}`);

  const results: Array<{ label: string; status: number | "dry"; data: unknown }> = [];

  for (const p of probes) {
    try {
      const res = await client.request(p.method, p.path, {
        params: { source: "crm" },
        body: p.body,
        capture: !isDryRun,
        dryRun: isDryRun,
        tag: `write-probe-${p.label}`,
      });
      if (!res) {
        results.push({ label: p.label, status: "dry", data: "(dry-run saved to docs/dry-runs/)" });
        continue;
      }
      results.push({ label: p.label, status: res.status, data: res.data });
      console.log(`  ${p.label} -> HTTP ${res.status}`);
    } catch (err) {
      console.error(`  ${p.label} threw:`, err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n=== summary ===");
  for (const r of results) {
    const dataPreview =
      typeof r.data === "string"
        ? r.data.slice(0, 200)
        : JSON.stringify(r.data).slice(0, 200);
    console.log(`${r.label}\tstatus=${r.status}\t${dataPreview}`);
  }
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
