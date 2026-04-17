/**
 * CLI: pnpm run push -- <path-to-.dg> [--yes] [--message <msg>]
 *
 * .dg ファイルをリモートに反映する。
 * デフォルトでは事前にリモート body との diff を表示し、--yes が無いと確認待ち（CI 用には --yes）。
 *
 * 終了コード:
 *   0: 反映成功 / 差分無し
 *   1: 構文エラー or HTTP エラー
 *   2: usage エラー
 */
import { basename, resolve } from "node:path";
import { createZohoClientFromEnv } from "../client/zohoClient.js";
import { readDg } from "../commands/dgfile.js";
import { pushFunction } from "../commands/push.js";
import { resolveFunctionId, getWrappedScript } from "../commands/exec.js";
import { extractBodyFromWrapped } from "../commands/dgfile.js";

function usage(): never {
  console.error("Usage: pnpm run push -- <path-to-.dg> [--yes] [--message <msg>]");
  process.exit(2);
}

function unifiedDiff(a: string, b: string): string {
  const al = a.split("\n");
  const bl = b.split("\n");
  const out: string[] = [];
  const max = Math.max(al.length, bl.length);
  for (let i = 0; i < max; i++) {
    if (al[i] === bl[i]) continue;
    if (al[i] !== undefined) out.push(`- ${al[i]}`);
    if (bl[i] !== undefined) out.push(`+ ${bl[i]}`);
  }
  return out.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const yes = argv.includes("--yes");
  const msgIdx = argv.indexOf("--message");
  const commitMessage = msgIdx >= 0 ? argv[msgIdx + 1] : undefined;
  const path = argv.find((a) => !a.startsWith("--") && a !== commitMessage);
  if (!path) usage();

  const fallback = basename(path).replace(/\.dg$/, "");
  const dg = readDg(resolve(path), fallback);

  const client = createZohoClientFromEnv({ allowProdWrite: true });
  const id = await resolveFunctionId(client, dg.apiName);
  if (!id) {
    console.error(`function ${dg.apiName} not found in remote`);
    process.exit(1);
  }
  const wrapped = await getWrappedScript(client, id);
  const remoteBody = wrapped ? extractBodyFromWrapped(wrapped.script) : "";

  if (remoteBody.trim() === dg.body.trim()) {
    console.log(`no diff: ${dg.apiName} is up to date`);
    process.exit(0);
  }

  console.log(`### diff for ${dg.apiName} (remote → local) ###`);
  console.log(unifiedDiff(remoteBody, dg.body));
  console.log("###");

  if (!yes) {
    console.error("(dry: pass --yes to actually push)");
    process.exit(0);
  }

  const r = await pushFunction(client, dg, { commitMessage, capture: true });
  if (r.kind === "syntax") {
    console.error(`[ERR] L${r.lineNumber}: ${r.message}`);
    process.exit(1);
  }
  console.log(`pushed ${dg.apiName} (id=${r.id})`);
}

main().catch((err) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  process.exit(1);
});
