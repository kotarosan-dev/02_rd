/**
 * Phase 1.9: 関数削除 probe。
 *
 * 標準的な REST だと DELETE /functions/<id>。クエリ要不要は不明。
 * 安全のため、削除対象は環境変数 DELETE_TARGET_ID で明示的に指定する。
 *
 * 実行:
 *   $env:DELETE_TARGET_ID="2445000000056009"; pnpm dotenvx run -- tsx scripts/probe-function-delete.ts
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const TARGET_ID = process.env.DELETE_TARGET_ID;
if (!TARGET_ID) {
  console.error("ERROR: DELETE_TARGET_ID env var is required (e.g. 2445000000056009)");
  process.exit(2);
}

interface Probe {
  label: string;
  params?: Record<string, string>;
}

const probes: Probe[] = [
  { label: "D1_no_query" },
  { label: "D2_source_crm", params: { source: "crm" } },
  { label: "D3_language_deluge", params: { language: "deluge" } },
  { label: "D4_type_org", params: { type: "org" } },
];

async function main() {
  const client = createZohoClientFromEnv({ allowProdWrite: true });
  console.log(`Target id = ${TARGET_ID}`);

  for (const p of probes) {
    console.log(`\n>>> ${p.label}  params=${JSON.stringify(p.params ?? {})}`);
    const res = await client.request("DELETE", `/crm/v2/settings/functions/${TARGET_ID}`, {
      params: p.params,
      capture: true,
      tag: `delete-${p.label}`,
    });
    if (!res) continue;
    const preview = JSON.stringify(res.data).slice(0, 300);
    console.log(`    HTTP ${res.status}  ${preview}`);
    if (res.status === 200) {
      console.log(`*** DELETE SUCCESS via ${p.label} ***`);
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  // 念のため再 GET で 404 になるか検証
  console.log(`\nVerifying via GET ${TARGET_ID}...`);
  const v = await client.request("GET", `/crm/v2/settings/functions/${TARGET_ID}`, {
    params: { source: "crm" },
  });
  if (v) console.log(`GET after delete -> HTTP ${v.status}  ${JSON.stringify(v.data).slice(0, 200)}`);
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
