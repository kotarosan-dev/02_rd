/**
 * CLI: pnpm run try -- <path-to-.dg> [--yes]
 *
 * 1. .dg を読む
 * 2. push (差分があれば) — --yes 必須でなく、try は常に push する想定
 * 3. execute（args は .dg の `//! args:`）
 * 4. expect status / expect log を assert
 * 5. 結果を [PASS] / [FAIL] / [ERR] の決まった行頭で stdout に出力
 *
 * Cursor の Agent モードがこの出力を読んで自動修正→再 try を回せる契約。
 *
 * 終了コード:
 *   0: PASS
 *   1: FAIL (assert 違反 / runtime error / syntax error)
 *   2: usage / 致命的エラー
 */
import { basename, resolve } from "node:path";
import { createZohoClientFromEnv } from "../client/zohoClient.js";
import { readDg } from "../commands/dgfile.js";
import { pushFunction } from "../commands/push.js";
import { execFunction } from "../commands/exec.js";

function usage(): never {
  console.error("Usage: pnpm run try -- <path-to-.dg>");
  process.exit(2);
}

async function main() {
  const argv = process.argv.slice(2);
  const path = argv.find((a) => !a.startsWith("--"));
  if (!path) usage();

  const fallback = basename(path).replace(/\.dg$/, "");
  const dg = readDg(resolve(path), fallback);

  const client = createZohoClientFromEnv({ allowProdWrite: true });

  console.log(`>>> push ${dg.apiName}`);
  const p = await pushFunction(client, dg, { commitMessage: "try" });
  if (p.kind === "syntax") {
    console.log(`[FAIL] syntax error`);
    console.log(`[ERR] L${p.lineNumber}${p.charPosition !== undefined ? `:${p.charPosition}` : ""}: ${p.message}`);
    process.exit(1);
  }
  console.log(`    pushed (id=${p.id})`);

  console.log(`>>> execute ${dg.apiName}  args=${JSON.stringify(dg.args)}`);
  const r = await execFunction(client, dg.apiName, dg.args, { capture: true, tag: `try-${dg.apiName}` });
  console.log(`    status=${r.status}  ${r.metrics ? `${r.metrics.statements_executed} stmts / ${r.metrics.time_taken_in_ms}ms` : ""}`);
  for (const l of r.logs) {
    console.log(`    [${l.category === "error" ? "ERR" : "LOG"}] L${l.line_number}: ${l.value}`);
  }
  if (r.error) {
    console.log(`    [ERR] L${r.error.line_number}: ${r.error.type}: ${r.error.message}`);
  }

  // assertions
  const failures: string[] = [];
  if (r.status !== dg.expectStatus) {
    failures.push(`expected status=${dg.expectStatus} but got ${r.status}`);
  }
  for (const want of dg.expectLogs) {
    const hit = r.logs.some((l) => l.value.includes(want));
    if (!hit) failures.push(`expected log containing "${want}" but not found`);
  }

  if (failures.length === 0) {
    console.log(`[PASS] ${dg.apiName}`);
    process.exit(0);
  }
  console.log(`[FAIL] ${dg.apiName}`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  process.exit(2);
});
