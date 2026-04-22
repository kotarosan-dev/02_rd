/**
 * Lyte UI / Crux Components の生 JS ソース（JSDoc 入り）を取得する。
 *
 * 出典:
 *  - https://www.zohocrm.dev/addons/@zoho/lyte-ui-component/dist/components/{name}.js
 *  - https://www.zohocrm.dev/addons/@zohocrm/crux-components/dist/components/{name}.js
 *
 * これらは fingerprint_config.json には載っていない（addons 系は CDN 直配信）。
 * ファイル名一覧は `dxh-data-store/components-configuration.json` から取る。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import pLimit from "p-limit";
import { SlyteDocClient } from "../client/slyteClient.js";

const RAW = resolve("docs/_raw");
const OUT_LYTE = join(RAW, "components-source", "lyte");
const OUT_CRUX = join(RAW, "components-source", "crux");

const CONCURRENCY = Number(process.env.SLYTEUI_CONCURRENCY ?? "6");

interface ComponentsConfig {
  "ui-components"?: { components?: Record<string, unknown> };
  "crux-components"?: { components?: Record<string, unknown> };
}

function loadComponentNames(): { lyte: string[]; crux: string[] } {
  const cfgPath = join(RAW, "dxh-data-store", "components-configuration.json");
  if (!existsSync(cfgPath)) {
    throw new Error(
      `components-configuration.json not found. Run \`pnpm run pull\` first.\n  ${cfgPath}`,
    );
  }
  const cfg: ComponentsConfig = JSON.parse(readFileSync(cfgPath, "utf8"));
  const lyte = Object.keys(cfg["ui-components"]?.components ?? {});
  const crux = Object.keys(cfg["crux-components"]?.components ?? {});
  return { lyte, crux };
}

async function fetchOne(
  client: SlyteDocClient,
  remote: string,
  outPath: string,
): Promise<{ ok: boolean; size: number; err?: string }> {
  try {
    const res = await client.getText(remote);
    if (res.status !== 200) {
      return { ok: false, size: 0, err: `HTTP ${res.status}` };
    }
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, res.text, "utf8");
    return { ok: true, size: res.text.length };
  } catch (e) {
    return { ok: false, size: 0, err: (e as Error).message };
  }
}

async function main() {
  const { lyte, crux } = loadComponentNames();
  const client = new SlyteDocClient();
  const limit = pLimit(CONCURRENCY);

  console.log(`Lyte UI components: ${lyte.length}`);
  console.log(`Crux components:    ${crux.length}`);

  const tasks: Promise<{ name: string; group: string; ok: boolean; size: number; err?: string }>[] = [];

  for (const name of lyte) {
    tasks.push(
      limit(async () => {
        const out = join(OUT_LYTE, `${name}.js`);
        const remote = `/addons/@zoho/lyte-ui-component/dist/components/${name}.js`;
        const r = await fetchOne(client, remote, out);
        return { name, group: "lyte", ...r };
      }),
    );
  }

  for (const name of crux) {
    tasks.push(
      limit(async () => {
        const out = join(OUT_CRUX, `${name}.js`);
        const remote = `/addons/@zohocrm/crux-components/dist/components/${name}.js`;
        const r = await fetchOne(client, remote, out);
        return { name, group: "crux", ...r };
      }),
    );
  }

  const results = await Promise.all(tasks);
  let ok = 0, fail = 0, total = 0;
  for (const r of results) {
    if (r.ok) {
      ok++;
      total += r.size;
      console.log(`  ok ${r.group}/${r.name}.js  (${(r.size / 1024).toFixed(1)} KB)`);
    } else {
      fail++;
      console.warn(`  FAIL ${r.group}/${r.name}.js  ${r.err}`);
    }
  }
  console.log(
    `\nDone. ok=${ok} fail=${fail} bytes=${(total / 1024).toFixed(0)} KB`,
  );
  console.log(`Wrote to ${OUT_LYTE} and ${OUT_CRUX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
