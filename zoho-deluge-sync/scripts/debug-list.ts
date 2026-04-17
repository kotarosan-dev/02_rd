import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const c = createZohoClientFromEnv();
const r = await c.request("GET", "/crm/v2/settings/functions", {
  params: { type: "org", start: "1", limit: "200" },
});
const fns = ((r?.data as { functions?: Array<{ id: string; name?: string; api_name?: string }> })?.functions) ?? [];
console.log("count=", fns.length, "info=", JSON.stringify((r?.data as { info?: unknown })?.info));
for (const f of fns) console.log(" ", f.id, f.name, "/", f.api_name);
