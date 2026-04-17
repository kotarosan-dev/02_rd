/**
 * Phase 1 疎通確認スクリプト。
 *
 * 実行: pnpm run smoke
 * （内部で dotenvx run が .env を復号して環境変数を注入する）
 *
 * 期待動作:
 *   - 200 で関数一覧（数値 array）が取れる
 *   - docs/request-captures/ に生 JSON が落ちる
 *
 * 失敗パターンの早見表:
 *   - 401 / 403  : Cookie or CSRF token が失効。ブラウザでログインし直して .env を更新
 *   - 200 だが本文に "AUTHENTICATION_FAILURE" 等 : org id が違う、または cookie に該当 org の権限がない
 *   - HTML が返る : Cookie が完全に死んでログイン画面に redirect されている
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

async function main() {
  const client = createZohoClientFromEnv();

  console.log("--- Phase 1 smoke test: GET /crm/v2/settings/functions?type=org ---");
  const res = await client.listFunctions({ type: "org", start: 1, limit: 50, capture: true });

  if (!res) {
    console.error("unexpected: response was null (dry-run mode?)");
    process.exit(2);
  }

  console.log(`HTTP ${res.status} ${res.statusText}`);

  const ct = String(res.headers["content-type"] ?? "");
  if (!ct.includes("application/json")) {
    console.error("ERROR: response is not JSON. Likely redirected to login page.");
    console.error(`content-type: ${ct}`);
    const head = typeof res.data === "string" ? res.data.slice(0, 400) : JSON.stringify(res.data).slice(0, 400);
    console.error(`body head:\n${head}`);
    process.exit(1);
  }

  if (res.status >= 400) {
    console.error("ERROR: non-2xx response.");
    console.error(JSON.stringify(res.data, null, 2));
    process.exit(1);
  }

  const data = res.data as Record<string, unknown>;
  const functions = (data.functions ?? data.data ?? data.records ?? []) as unknown[];
  if (!Array.isArray(functions)) {
    console.warn("WARN: response did not contain a recognizable 'functions' array.");
    console.log("Top-level keys:", Object.keys(data));
  } else {
    console.log(`OK: retrieved ${functions.length} function(s).`);
    if (functions.length > 0) {
      const sample = functions[0] as Record<string, unknown>;
      console.log("first function keys:", Object.keys(sample));
      const id = sample["id"] ?? sample["function_id"] ?? "(no id field)";
      const name = sample["display_name"] ?? sample["name"] ?? "(no name field)";
      console.log(`  sample: id=${String(id)}  name=${String(name)}`);
    }
  }

  console.log("\nphase 1 smoke test: PASS");
}

main().catch((err) => {
  console.error("unhandled error:", err);
  process.exit(1);
});
