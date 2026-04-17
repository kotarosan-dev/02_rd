/**
 * CLI: pnpm run delete -- <api_name> [--yes] [--keep-local]
 *
 * 安全のため、--yes が無いと「これから消そうとしている」だけ表示して終了。
 * デフォルトでは ローカル deluge/<api_name>.dg も削除する（--keep-local で残せる）。
 */
import { existsSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { createZohoClientFromEnv } from "../client/zohoClient.js";
import { deleteFunction } from "../commands/delete.js";
import { resolveFunctionId } from "../commands/exec.js";

function usage(): never {
  console.error("Usage: pnpm run delete -- <api_name> [--yes] [--keep-local]");
  process.exit(2);
}

async function main() {
  const argv = process.argv.slice(2);
  const apiName = argv.find((a) => !a.startsWith("--"));
  if (!apiName) usage();
  const yes = argv.includes("--yes");
  const keepLocal = argv.includes("--keep-local");

  const client = createZohoClientFromEnv({ allowProdWrite: true });
  const id = await resolveFunctionId(client, apiName);
  if (!id) {
    console.error(`function api_name=${apiName} not found in remote`);
    process.exit(1);
  }
  console.log(`target: ${apiName} (id=${id})`);

  if (!yes) {
    console.error("(dry: pass --yes to actually delete)");
    process.exit(0);
  }

  const r = await deleteFunction(client, apiName);
  console.log(`deleted remote ${apiName} (id=${r.id})`);

  if (!keepLocal) {
    const localPath = resolve(join("deluge", `${apiName}.dg`));
    if (existsSync(localPath)) {
      unlinkSync(localPath);
      console.log(`removed local ${localPath}`);
    }
  }
}

main().catch((err) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  process.exit(1);
});
