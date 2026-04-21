import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DiscoveredAsset } from "../inspect/fingerprintParser.js";

const p = resolve("src/endpoints.json");
if (!existsSync(p)) {
  console.error("src/endpoints.json not found. Run `pnpm run inspect` first.");
  process.exit(1);
}
const { assets } = JSON.parse(readFileSync(p, "utf8")) as { assets: DiscoveredAsset[] };
const filterArg = process.argv[2];
const list = filterArg
  ? assets.filter((a) => a.logicalPath.includes(filterArg) || a.url.includes(filterArg))
  : assets;

console.log(`# ${list.length} assets${filterArg ? ` (filter: ${filterArg})` : ""}\n`);
for (const a of list) {
  console.log(`${a.ext.padEnd(4)}  ${a.url}`);
}
