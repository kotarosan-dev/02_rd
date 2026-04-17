/**
 * CLI: pnpm run create -- <api_name> [--params <json>] [--display <name>] [--no-pull]
 *
 * 例:
 *   pnpm run create -- lead_to_contact
 *   pnpm run create -- lead_to_contact --params '[{"name":"leadId","type":"STRING"}]'
 *
 * 作成後、すぐに deluge/<api_name>.dg を pull で書き出す（--no-pull で抑制可）。
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createZohoClientFromEnv } from "../client/zohoClient.js";
import { createFunction } from "../commands/create.js";
import { serializeDg, type DgFile, type DgParam } from "../commands/dgfile.js";

function usage(): never {
  console.error(
    "Usage: pnpm run create -- <api_name> [--display <name>] [--params <json>] [--no-pull]"
  );
  process.exit(2);
}

function getOpt(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const apiName = argv.find((a) => !a.startsWith("--"));
  if (!apiName) usage();

  const display = getOpt(argv, "--display");
  const paramsJson = getOpt(argv, "--params");
  const noPull = argv.includes("--no-pull");

  const params: DgParam[] = paramsJson ? JSON.parse(paramsJson) : [];

  const client = createZohoClientFromEnv({ allowProdWrite: true });
  const r = await createFunction(client, {
    apiName,
    displayName: display,
    params,
  });
  const finalName = r.apiName;
  console.log(`created ${finalName} (id=${r.id})`);

  if (!noPull) {
    const outPath = resolve(join("deluge", `${finalName}.dg`));
    if (existsSync(outPath)) {
      console.log(`local file already exists: ${outPath} (skip generating stub)`);
      return;
    }
    const dg: DgFile = {
      apiName: finalName,
      returnType: "void",
      params,
      args: {},
      expectStatus: "success",
      expectLogs: [],
      body: `info "TODO: implement ${finalName}";`,
    };
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, serializeDg(dg), "utf8");
    console.log(`stubbed ${outPath}`);
  }
}

main().catch((err) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  process.exit(1);
});
