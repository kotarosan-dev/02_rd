import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import pLimit from "p-limit";
import { SlyteDocClient } from "../client/slyteClient.js";
import { filterAssets, type DiscoveredAsset } from "../inspect/fingerprintParser.js";

const ENDPOINTS_PATH = resolve("src/endpoints.json");
if (!existsSync(ENDPOINTS_PATH)) {
  console.error("src/endpoints.json not found. Run `pnpm run inspect` first.");
  process.exit(1);
}

interface EndpointsFile {
  manifest_version: string | null;
  fetched_at: string;
  assets: DiscoveredAsset[];
}

const data: EndpointsFile = JSON.parse(readFileSync(ENDPOINTS_PATH, "utf8"));

// 既定: SlyteUI 関連 + 主要リファレンス JSON のみ。`-- all` で全件
const mode = process.argv[2] ?? "default";
const targets: DiscoveredAsset[] =
  mode === "all"
    ? data.assets.filter((a) => ["json", "md"].includes(a.ext))
    : [
        // dxh-data-store の主要設定 JSON 全件（サイドバー + リファレンス）
        ...filterAssets(data.assets, { categories: ["dxh-data-store"], exts: ["json", "md"] }),
        // SlyteUI のサンプル MD/JSON
        ...filterAssets(data.assets, {
          pathIncludes: ["slyteui/"],
          exts: ["md", "json"],
        }),
        // Client Script / Widget サンプルの MD（参照用）
        ...filterAssets(data.assets, {
          pathIncludes: ["client-script/Samples", "widgets/Samples"],
          exts: ["md", "json"],
        }),
      ];

const seen = new Set<string>();
const unique = targets.filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)));

console.log(`Pulling ${unique.length} assets (mode=${mode})`);

const client = new SlyteDocClient();
const concurrency = Number(process.env.SLYTEUI_CONCURRENCY ?? "5");
const limit = pLimit(concurrency);
const rawRoot = resolve("docs/_raw");
let ok = 0,
  fail = 0;

async function pullOne(a: DiscoveredAsset) {
  const outPath = join(rawRoot, a.logicalPath);
  mkdirSync(dirname(outPath), { recursive: true });
  try {
    if (a.ext === "json") {
      const res = await client.get(a.url);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      writeFileSync(outPath, JSON.stringify(res.data, null, 2), "utf8");
    } else {
      const res = await client.getText(a.url);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      writeFileSync(outPath, res.text, "utf8");
    }
    ok++;
    if (ok % 10 === 0) console.log(`  [${ok}/${unique.length}] ...`);
  } catch (e) {
    fail++;
    console.error(`  FAIL ${a.url}: ${(e as Error).message}`);
  }
}

await Promise.all(unique.map((a) => limit(() => pullOne(a))));
console.log(`\nDone. ok=${ok} fail=${fail}`);
console.log(`Saved to ${rawRoot}`);
console.log("Next: pnpm run skill:sync  (Phase 4 — references/*.md 生成)");
