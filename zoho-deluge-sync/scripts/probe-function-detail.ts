/**
 * Phase 1.5: 個別関数の詳細取得を試す probe。
 *
 * Deluge ソース本体がどのエンドポイントから取れるかを発見する。
 * 試すパターン:
 *   A. GET /crm/v2/settings/functions/<id>
 *   B. GET /crm/v2/settings/functions/<id>?category=automation
 *   C. GET /crm/v2/settings/functions/<id>/script
 *   D. GET /crm/v2/settings/functions/<id>?include=source
 *
 * 全て capture=true で記録するので、後で endpoint-map.md に反映できる。
 *
 * 実行: pnpm dotenvx run -- tsx scripts/probe-function-detail.ts
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const TARGET_ID = process.env.PROBE_FUNCTION_ID ?? "2445000000056007"; // thisistest
const TARGET_CATEGORY = process.env.PROBE_FUNCTION_CATEGORY ?? "automation";

interface Probe {
  label: string;
  method: "GET";
  path: string;
  params?: Record<string, string>;
}

const probes: Probe[] = [
  { label: "E_source_crm", method: "GET", path: `/crm/v2/settings/functions/${TARGET_ID}`, params: { source: "crm" } },
  {
    label: "F_source_crm_category",
    method: "GET",
    path: `/crm/v2/settings/functions/${TARGET_ID}`,
    params: { source: "crm", category: TARGET_CATEGORY },
  },
  {
    label: "G_source_crm_type_org",
    method: "GET",
    path: `/crm/v2/settings/functions/${TARGET_ID}`,
    params: { source: "crm", type: "org" },
  },
  {
    label: "H_source_crm_script_suffix",
    method: "GET",
    path: `/crm/v2/settings/functions/${TARGET_ID}/script`,
    params: { source: "crm" },
  },
];

function summarize(label: string, status: number, data: unknown) {
  const dataStr =
    typeof data === "string"
      ? data.slice(0, 200)
      : JSON.stringify(data, null, 2).slice(0, 600);
  // eslint-disable-next-line no-console
  console.log(`\n=== ${label} -> HTTP ${status} ===`);
  // eslint-disable-next-line no-console
  console.log(dataStr);
}

async function main() {
  const client = createZohoClientFromEnv();
  console.log(`Target function id = ${TARGET_ID} (category=${TARGET_CATEGORY})`);

  for (const p of probes) {
    try {
      const res = await client.request(p.method, p.path, {
        params: p.params,
        capture: true,
        tag: `probe-${p.label}`,
      });
      if (res) summarize(p.label, res.status, res.data);
    } catch (err) {
      console.error(`probe ${p.label} threw:`, err);
    }
    // 軽い間隔
    await new Promise((r) => setTimeout(r, 300));
  }
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
