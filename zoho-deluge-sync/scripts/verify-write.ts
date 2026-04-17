import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const id = process.env.PROBE_FUNCTION_ID ?? "2445000000056007";

(async () => {
  const c = createZohoClientFromEnv();
  const r = await c.request("GET", `/crm/v2/settings/functions/${id}`, {
    params: { source: "crm" },
  });
  if (!r) return;
  const data = r.data as { functions?: Array<Record<string, unknown>> };
  const f = data.functions?.[0];
  if (!f) return;
  console.log("HTTP", r.status);
  console.log("script :", JSON.stringify(f.script));
  console.log("updatedTime :", f.updatedTime);
  console.log("modified_on :", f.modified_on);
  console.log("modified_by :", f.modified_by);
})();
