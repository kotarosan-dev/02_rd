import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { SlyteDocClient } from "../client/slyteClient.js";
import { flattenManifest } from "../inspect/fingerprintParser.js";

const outPath = resolve(process.argv[2] ?? "src/endpoints.json");

const client = new SlyteDocClient();
console.log(`Fetching ${client.baseUrl}/fingerprint_config.json ...`);
const cfg = await client.fetchFingerprintConfig();
const assets = flattenManifest(cfg);

const byCategory = new Map<string, number>();
const byExt = new Map<string, number>();
for (const a of assets) {
  byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + 1);
  byExt.set(a.ext, (byExt.get(a.ext) ?? 0) + 1);
}

console.log(`\nDiscovered ${assets.length} assets`);
console.log(`Manifest version: ${cfg.versions?.version ?? "(unknown)"}\n`);

console.log("== By category ==");
for (const [k, v] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v.toString().padStart(5)}  ${k}`);
}
console.log("\n== By extension ==");
for (const [k, v] of [...byExt.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v.toString().padStart(5)}  .${k}`);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    { manifest_version: cfg.versions?.version ?? null, fetched_at: new Date().toISOString(), assets },
    null,
    2,
  ),
  "utf8",
);
console.log(`\nWrote ${assets.length} assets to ${outPath}`);
console.log("Next: pnpm run pull          (default: SlyteUI 関連のみ)");
console.log("      pnpm run pull -- all   (全件)");
