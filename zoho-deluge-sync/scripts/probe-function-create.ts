/**
 * Phase 1.8: 新規関数作成 probe。
 *
 * HAR から判明:
 *   POST /crm/v2/settings/functions
 *   Content-Type: application/json; charset=UTF-8
 *   Content-Length: 148 (内容は未確認)
 *
 * 推測: update と同じく "details" でラップ。category 等が要るかは未検証。
 *
 * 戦略: いくつかの body 形を順に試し、最初に 200 を返したものが正解。
 *       作成された関数は最後に id を表示するので、UI から手動で削除可能。
 *
 * 実行:
 *   $env:DRY_RUN="1"; pnpm dotenvx run -- tsx scripts/probe-function-create.ts
 *   pnpm dotenvx run -- tsx scripts/probe-function-create.ts
 */
import { createZohoClientFromEnv } from "../src/client/zohoClient.js";

const isDryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

const stamp = Math.floor(Date.now() / 1000).toString().slice(-8);
const NAME = `_probe_create_${stamp}`;
const NAMESPACE = "automation";
// HAR スクリーンショット由来: workflow には body のみ（ラッパー無し）。
// 改行入りで OK（JSON 文字列として "\n" を含める）
const WORKFLOW_BODY = `\ninfo "probe ${stamp}";\n`;

interface Probe {
  label: string;
  body: unknown;
  contentType?: string;
  params?: Record<string, string>;
}

// 想定: UI は「POST で空スタブ作成 → PUT で内容保存」の 2 段階。
// HAR で観測した POST は Content-Length 148 とコンパクトだったため、stub 作成だけのはず。
// クエリパラメータと body 構造を変えて 200 / 4xx の反応を見る。
const STUB_FLAT = {
  functions: [
    {
      name: NAME,
      display_name: NAME,
      description: "",
      return_type: "void",
      params: [],
    },
  ],
};

const probes: Probe[] = [
  // C10: query なし, flat body
  { label: "C10_no_query_flat", contentType: "application/json; charset=UTF-8", body: STUB_FLAT },
  // C11: ?language=deluge, flat body
  {
    label: "C11_query_lang_flat",
    contentType: "application/json; charset=UTF-8",
    params: { language: "deluge" },
    body: STUB_FLAT,
  },
  // C12: ?type=org
  {
    label: "C12_query_type_org",
    contentType: "application/json; charset=UTF-8",
    params: { type: "org" },
    body: STUB_FLAT,
  },
  // C13: ?category=automation
  {
    label: "C13_query_category",
    contentType: "application/json; charset=UTF-8",
    params: { category: "automation" },
    body: STUB_FLAT,
  },
  // C14: full HAR-style body INCLUDING workflow+commit_message (in case POST=full save)
  {
    label: "C14_post_full_har_style",
    contentType: "application/json; charset=UTF-8",
    params: { language: "deluge" },
    body: {
      functions: [
        {
          display_name: NAME,
          description: "",
          name: NAME,
          return_type: "void",
          params: [],
          workflow: WORKFLOW_BODY,
          commit_message: `create ${NAME}`,
          category: "automation",
        },
      ],
    },
  },
];

async function main() {
  const client = createZohoClientFromEnv({ allowProdWrite: true });
  console.log(`Target new function: name=${NAME}, namespace=${NAMESPACE}`);
  console.log(`Workflow body:\n${WORKFLOW_BODY}---`);
  console.log(`dry-run = ${isDryRun}, ${probes.length} probes\n`);

  let createdId: string | null = null;

  for (const p of probes) {
    const rawBody = JSON.stringify(p.body);
    const tag = `create-${p.label}`;
    console.log(`>>> ${p.label}  (Content-Length=${rawBody.length}, ct=${p.contentType})`);
    if (p.params) console.log(`    params=${JSON.stringify(p.params)}`);

    try {
      const res = await client.request("POST", "/crm/v2/settings/functions", {
        params: p.params,
        rawBody,
        contentType: p.contentType,
        capture: !isDryRun,
        dryRun: isDryRun,
        tag,
      });

      if (!res) {
        console.log(`    [dry-run saved]\n`);
        continue;
      }

      const respPreview = JSON.stringify(res.data).slice(0, 300);
      console.log(`    HTTP ${res.status}  ${respPreview}\n`);

      const data = res.data as {
        functions?: Array<{
          status?: string;
          details?: { id?: string };
          message?: string;
        }>;
      };
      const f = data.functions?.[0];
      if (res.status === 200 && f?.status === "success") {
        createdId = f.details?.id ?? null;
        console.log(`*** CREATE SUCCESS via ${p.label} ***`);
        if (createdId) console.log(`    new function id = ${createdId}`);
        else console.log(`    (id not in response. fetch list to confirm.)`);
        break;
      }
    } catch (err) {
      console.error(`    ${p.label} threw:`, err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!isDryRun) {
    if (createdId) {
      console.log(`\nCleanup hint: open Zoho UI → Setup → Functions → delete '${NAME}' (id ${createdId})`);
    } else {
      // 作成成功した可能性もあるので list で念のため確認
      console.log(`\nVerifying via list...`);
      const lr = await client.listFunctions({ type: "org", capture: false });
      if (lr) {
        const funcs = (lr.data as { functions?: Array<{ api_name?: string; id?: string }> }).functions ?? [];
        const found = funcs.find((f) => f.api_name === NAME);
        if (found) {
          console.log(`*** Function '${NAME}' exists in list. id=${found.id} ***`);
          console.log(`Cleanup hint: delete from UI.`);
        } else {
          console.log(`Function '${NAME}' not found. None of the probes succeeded.`);
        }
      }
    }
  }
}

main().catch((err) => {
  console.error("unhandled:", err);
  process.exit(1);
});
