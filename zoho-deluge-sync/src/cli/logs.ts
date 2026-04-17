/**
 * CLI: pnpm run logs -- <api_name> [period] [page] [per_page]
 *
 * 例:
 *   pnpm run logs -- aitest_ping
 *   pnpm run logs -- aitest_ping past_7_days 1 100
 *
 * 一覧 (function_logs) を表形式で表示する。詳細を見たい場合は別途 --detail <log_id> を使う。
 */
import { createZohoClientFromEnv } from "../client/zohoClient.js";
import { listLogs, getLogDetail } from "../commands/logs.js";

function usage(): never {
  console.error(
    "Usage:\n  pnpm run logs -- <api_name> [period] [page] [per_page]\n  pnpm run logs -- <api_name> --detail <log_id>"
  );
  process.exit(2);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage();
  const apiName = argv[0];

  const client = createZohoClientFromEnv({ allowProdWrite: false });

  const detailIdx = argv.indexOf("--detail");
  if (detailIdx >= 0) {
    const logId = argv[detailIdx + 1];
    if (!logId) usage();
    const data = await getLogDetail(client, apiName, logId);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const [, period, page, perPage] = argv;
  const r = await listLogs(client, apiName, {
    period: period ?? "past_24_hours",
    page: page ? Number(page) : 1,
    perPage: perPage ? Number(perPage) : 40,
  });

  console.log(
    `function: ${r.apiName}  page=${r.page}/perPage=${r.per_page} total=${r.total} more=${r.more}`
  );
  if (r.items.length === 0) {
    console.log("(no logs)");
    return;
  }
  for (const i of r.items) {
    console.log(
      `  ${i.executed_time}  [${i.status.padEnd(7)}] ${String(i.execution_time).padStart(4)}ms  id=${i.id}`
    );
  }
  console.log(`\nhint: pnpm run logs -- ${apiName} --detail <id>  で詳細を取得`);
}

main().catch((err) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  process.exit(1);
});
