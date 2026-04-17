/**
 * CLI: pnpm run exec -- <api_name> [args-json]
 *
 * 例:
 *   pnpm run exec -- aitest_ping
 *   pnpm run exec -- aitest_ping '{"demo":"hello"}'
 *
 * 終了コード:
 *   0: status=success
 *   1: status=failure or HTTP error
 *   2: usage / 引数エラー
 */
import { createZohoClientFromEnv } from "../client/zohoClient.js";
import { execFunction, type ExecLog } from "../commands/exec.js";

function usage(): never {
  console.error("Usage: pnpm run exec -- <api_name> [args-json]");
  process.exit(2);
}

function colorize(line: ExecLog): string {
  const tag = line.category === "error" ? "ERR" : "LOG";
  return `  [${tag}] L${line.line_number}: ${line.value}`;
}

async function main() {
  const [apiName, argsJson] = process.argv.slice(2);
  if (!apiName) usage();

  let args: Record<string, unknown> = {};
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch {
      console.error(`invalid args-json: ${argsJson}`);
      process.exit(2);
    }
  }

  const client = createZohoClientFromEnv({ allowProdWrite: true });
  const r = await execFunction(client, apiName, args);

  console.log(`function : ${r.apiName}`);
  console.log(`status   : ${r.status}`);
  if (r.metrics) {
    console.log(
      `metrics  : ${r.metrics.statements_executed} stmts / ${r.metrics.time_taken_in_ms}ms`
    );
  }
  if (r.output != null) {
    console.log(`output   : ${JSON.stringify(r.output)}`);
  }
  if (r.logs.length) {
    console.log(`logs     :`);
    for (const l of r.logs) console.log(colorize(l));
  }
  if (r.error) {
    console.log(`error    : ${r.error.type} at L${r.error.line_number}`);
    console.log(`           ${r.error.message}`);
  }
  process.exit(r.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  process.exit(1);
});
