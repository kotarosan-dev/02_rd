/**
 * CLI: pnpm run pull -- <api_name> [path]
 *
 * リモート関数を取得し、deluge/<api_name>.dg として保存する。
 * 既存ファイルがある場合は --force を付けないと上書きしない。
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createZohoClientFromEnv } from "../client/zohoClient.js";
import { resolveFunctionId, getWrappedScript } from "../commands/exec.js";
import { extractBodyFromWrapped, writeDg, type DgFile } from "../commands/dgfile.js";

function usage(): never {
  console.error("Usage: pnpm run pull -- <api_name> [path] [--force]");
  process.exit(2);
}

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes("--force");
  const args = argv.filter((a) => a !== "--force");
  const [apiName, pathArg] = args;
  if (!apiName) usage();

  const outPath = resolve(pathArg ?? join("deluge", `${apiName}.dg`));
  if (existsSync(outPath) && !force) {
    console.error(`refuse to overwrite ${outPath}. add --force to overwrite.`);
    process.exit(1);
  }

  const client = createZohoClientFromEnv({ allowProdWrite: false });
  const id = await resolveFunctionId(client, apiName);
  if (!id) {
    console.error(`function api_name=${apiName} not found`);
    process.exit(1);
  }
  const wrapped = await getWrappedScript(client, id);
  if (!wrapped) {
    console.error("could not fetch wrapped script");
    process.exit(1);
  }
  const body = extractBodyFromWrapped(wrapped.script);

  // params を wrapped から雑に抽出（"void automation.NAME(String demo)" → [{name:'demo',type:'STRING'}]）
  const sigMatch = /\(([^)]*)\)/.exec(wrapped.script);
  const params =
    sigMatch && sigMatch[1].trim()
      ? sigMatch[1].split(",").map((p) => {
          const [type, name] = p.trim().split(/\s+/);
          return { name: name ?? type, type: (type ?? "STRING").toUpperCase() };
        })
      : [];

  const dg: DgFile = {
    apiName: wrapped.apiName,
    returnType: "void",
    params,
    args: {},
    expectStatus: "success",
    expectLogs: [],
    body,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeDg(outPath, dg);
  console.log(`wrote ${outPath} (${body.length} chars)`);
}

main().catch((err) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  process.exit(1);
});
