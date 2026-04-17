/**
 * Leads / Contacts の必須/利用可能フィールドを把握するための簡易スクリプト。
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const c = createZohoClientFromEnv();

// 1) Leads から1件取得
const leadsRes = await c.request("GET", "/crm/v2/Leads", {
  params: { per_page: "1" },
});
console.log("=== Leads sample (first 1) ===");
const leads = (leadsRes?.data as { data?: unknown[] })?.data ?? [];
console.log(JSON.stringify(leads[0], null, 2));

// 2) Contacts のレイアウト（必須項目）
const layoutsRes = await c.request("GET", "/crm/v2/settings/layouts", {
  params: { module: "Contacts" },
});
console.log("\n=== Contacts standard layout sections ===");
const layouts = (layoutsRes?.data as {
  layouts?: Array<{ name: string; sections?: Array<{ display_label: string; fields?: Array<{ api_name: string; required: boolean; system_mandatory: boolean; data_type: string }> }> }>;
})?.layouts ?? [];
const std = layouts.find((l) => l.name === "Standard") ?? layouts[0];
if (std) {
  for (const s of std.sections ?? []) {
    const required = (s.fields ?? []).filter((f) => f.required || f.system_mandatory);
    if (required.length === 0) continue;
    console.log(`\n[${s.display_label}]`);
    for (const f of required) console.log(`  * ${f.api_name} (${f.data_type}) ${f.system_mandatory ? "[system]" : "[layout]"}`);
  }
}
