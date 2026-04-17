/**
 * Phase 2.3: 意図的にエラーを起こして execute レスポンスの形を確認する。
 *   ケースA: ランタイムエラー (1/0)
 *   ケースB: 構文エラー (info "no semicolon")  → こちらは update 段階で弾かれる可能性
 *
 * 実行: pnpm dotenvx run -- tsx scripts/probe-execute-error.ts
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const NAME = process.env.FUNCTION_NAME ?? "aitest_ping";

async function findId(client: ReturnType<typeof createZohoClientFromEnv>) {
  const list = await client.request("GET", "/crm/v2/settings/functions", {
    params: { type: "org", start: "1", limit: "200" },
  });
  const rows = ((list?.data as { functions?: Array<{ id: string; name?: string; api_name?: string }> })?.functions ?? []);
  return rows.find((f) => f.name === NAME || f.api_name === NAME)?.id ?? null;
}

async function updateBody(
  client: ReturnType<typeof createZohoClientFromEnv>,
  id: string,
  workflow: string,
  msg: string
) {
  const body = JSON.stringify({
    functions: [
      {
        display_name: NAME,
        description: "",
        name: NAME,
        return_type: "void",
        params: [],
        workflow,
        commit_message: msg,
      },
    ],
  });
  return client.request("PUT", `/crm/v2/settings/functions/${id}`, {
    params: { language: "deluge" },
    rawBody: body,
    contentType: "text/plain;charset=UTF-8",
    tag: msg,
  });
}

async function execNow(client: ReturnType<typeof createZohoClientFromEnv>, id: string) {
  const det = await client.request("GET", `/crm/v2/settings/functions/${id}`, {
    params: { source: "crm" },
  });
  const wrapped = (det?.data as { functions?: Array<{ script?: string; api_name?: string }> })?.functions?.[0];
  const apiName = wrapped?.api_name ?? NAME;
  const body = JSON.stringify({ functions: [{ script: wrapped?.script ?? "", arguments: {} }] });
  return client.request("POST", `/crm/v9/settings/functions/${apiName}/actions/test`, {
    rawBody: body,
    contentType: "application/json; charset=UTF-8",
    capture: true,
    tag: `err-execute-${apiName}`,
  });
}

async function main() {
  const client = createZohoClientFromEnv({ allowProdWrite: true });
  const id = await findId(client);
  if (!id) {
    console.error(`function ${NAME} not found`);
    process.exit(1);
  }
  console.log(`target id=${id}\n`);

  // --- ケースA: ランタイムエラー (1/0) ---
  console.log("### Case A: runtime error (divide by zero) ###");
  const wfA = `\n\tx = 1 / 0;\n\tinfo x;\n`;
  const upA = await updateBody(client, id, wfA, "case-A divide by zero");
  console.log(`  update -> ${upA?.status}`);
  if (upA?.status !== 200) {
    console.log("  update body:");
    console.log("  " + JSON.stringify(upA?.data));
  }
  const exA = await execNow(client, id);
  console.log(`  execute -> ${exA?.status}`);
  console.log(JSON.stringify(exA?.data, null, 2));

  await new Promise((r) => setTimeout(r, 1000));

  // --- ケースB: 構文エラー (セミコロン無し) ---
  console.log("\n### Case B: syntax error (missing semicolon) ###");
  const wfB = `\n\tinfo "no semicolon"\n`;
  const upB = await updateBody(client, id, wfB, "case-B syntax error");
  console.log(`  update -> ${upB?.status}`);
  console.log("  body: " + JSON.stringify(upB?.data));
  if (upB?.status === 200) {
    const exB = await execNow(client, id);
    console.log(`  execute -> ${exB?.status}`);
    console.log(JSON.stringify(exB?.data, null, 2));
  }

  // 最後にクリーンな状態に戻す
  console.log("\n### restore clean state ###");
  await updateBody(
    client,
    id,
    `\n\tinfo "ping from aitest_ping";\n\tinfo "second log line";\n`,
    "restore clean"
  );
  console.log("done.");
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
