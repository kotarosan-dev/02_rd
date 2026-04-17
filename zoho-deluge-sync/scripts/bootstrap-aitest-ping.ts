/**
 * Phase 2.2: テスト関数 aitest_ping を作成し、本体を書き、実行する一気通貫スクリプト。
 *
 * 流れ:
 *   1) POST /crm/v2/settings/functions          : stub 作成 (flat body)
 *   2) PUT  /crm/v2/settings/functions/<id>?language=deluge
 *      : details ラッパで script を保存
 *   3) GET  /crm/v2/settings/functions/<id>?source=crm
 *      : 保存後の wrapped script を取得
 *   4) POST /crm/v9/settings/functions/<api_name>/actions/test
 *      : 実行
 *
 * 既に同名関数が存在する場合は作成をスキップし、id を再利用する。
 *
 * 実行:
 *   pnpm dotenvx run -- tsx scripts/bootstrap-aitest-ping.ts
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const NAME = process.env.FUNCTION_NAME ?? "aitest_ping";
const SCRIPT_BODY = `info "ping from aitest_ping";\ninfo "second log line";`;

interface FuncRow {
  id: string;
  name?: string;
  api_name?: string;
  display_name?: string;
}

async function findExisting(client: ReturnType<typeof createZohoClientFromEnv>): Promise<string | null> {
  const list = await client.request("GET", "/crm/v2/settings/functions", {
    params: { type: "org", start: "1", limit: "200" },
  });
  const rows = ((list?.data as { functions?: FuncRow[] })?.functions ?? []);
  const hit = rows.find((f) => f.name === NAME || f.api_name === NAME);
  return hit?.id ?? null;
}

async function main() {
  const client = createZohoClientFromEnv({ allowProdWrite: true });

  let id = await findExisting(client);
  if (id) {
    console.log(`existing function found: ${NAME} -> id=${id}`);
  } else {
    console.log(`creating new function: ${NAME}`);
    const createBody = JSON.stringify({
      functions: [
        {
          name: NAME,
          display_name: NAME,
          description: "",
          return_type: "void",
          params: [{ name: "demo", type: "STRING" }],
          category: "automation",
        },
      ],
    });
    const cr = await client.request("POST", "/crm/v2/settings/functions", {
      params: { language: "deluge" },
      rawBody: createBody,
      contentType: "application/json; charset=UTF-8",
      tag: "bootstrap-create",
    });
    console.log(`  POST -> ${cr?.status}  ${JSON.stringify(cr?.data).slice(0, 300)}`);
    if (!cr || cr.status !== 200) process.exit(1);
    id = await findExisting(client);
    if (!id) {
      console.error("created but cannot resolve id from list");
      process.exit(1);
    }
    console.log(`  created id=${id}`);
  }

  console.log(`\nupdating script body of id=${id} ...`);
  // HAR 09 で確定: details ラッパー無し、workflow に body のみ（ラップなし）
  const updateBody = JSON.stringify({
    functions: [
      {
        display_name: NAME,
        description: "",
        name: NAME,
        return_type: "void",
        params: [],
        workflow: `\n\t${SCRIPT_BODY.replace(/\n/g, "\n\t")}\n`,
        commit_message: `update ${NAME} from cursor`,
      },
    ],
  });
  const ur = await client.request("PUT", `/crm/v2/settings/functions/${id}`, {
    params: { language: "deluge" },
    rawBody: updateBody,
    contentType: "text/plain;charset=UTF-8",
    tag: "bootstrap-update",
  });
  console.log(`  PUT -> ${ur?.status}  ${JSON.stringify(ur?.data).slice(0, 300)}`);
  if (!ur || ur.status !== 200) process.exit(1);

  console.log(`\nfetching wrapped script ...`);
  const det = await client.request("GET", `/crm/v2/settings/functions/${id}`, {
    params: { source: "crm" },
  });
  const wrapped = (det?.data as { functions?: Array<{ script?: string; api_name?: string; name?: string }> })
    ?.functions?.[0];
  if (!wrapped?.script) {
    console.error("no script in detail response");
    process.exit(1);
  }
  const apiName = wrapped.api_name ?? wrapped.name ?? NAME;
  console.log(`  api_name=${apiName}`);
  console.log(`  --- wrapped script ---\n${wrapped.script}\n  ----------------------\n`);

  console.log(`executing ${apiName} ...`);
  const execBody = JSON.stringify({
    functions: [
      {
        script: wrapped.script,
        arguments: { demo: "hello-from-cursor" },
      },
    ],
  });
  const ex = await client.request("POST", `/crm/v9/settings/functions/${apiName}/actions/test`, {
    rawBody: execBody,
    contentType: "application/json; charset=UTF-8",
    capture: true,
    tag: `bootstrap-execute-${apiName}`,
  });
  console.log(`\n=== EXECUTE HTTP ${ex?.status} ===`);
  console.log(JSON.stringify(ex?.data, null, 2));

  // logs API: HAR 10 で確定
  await new Promise((r) => setTimeout(r, 1500));
  console.log(`\nfetching logs ...`);
  const lg = await client.request("GET", `/crm/v2.2/settings/functions/${id}/logs`, {
    params: { period: "past_24_hours", page: "1", per_page: "40", language: "deluge" },
    capture: true,
    tag: `bootstrap-logs-${apiName}`,
  });
  console.log(`=== LOGS HTTP ${lg?.status} ===`);
  console.log(JSON.stringify(lg?.data, null, 2));
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
