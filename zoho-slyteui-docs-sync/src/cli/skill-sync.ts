import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { jsonToMarkdown } from "../transform/jsonToMarkdown.js";
import { jsdocToMarkdown, looksLikeJsdoc } from "../transform/jsdocToMarkdown.js";

const SKILL_ROOT = join(homedir(), ".claude", "skills", "zoho-slyteui");
const REFS = join(SKILL_ROOT, "references");
const RAW = resolve("docs/_raw");

if (!existsSync(RAW)) {
  console.error(`docs/_raw not found. Run \`pnpm run pull\` first.`);
  process.exit(1);
}
mkdirSync(REFS, { recursive: true });

interface Mapping {
  /** docs/_raw からの相対パス */
  source: string;
  /** references/<name>.md */
  outName: string;
  /** Markdown のタイトル */
  title: string;
}

const MAPPINGS: Mapping[] = [
  { source: "dxh-data-store/slyte-components-configuration.json", outName: "slyte-sidebar.md",       title: "SlyteUI Sidebar / Routes" },
  { source: "dxh-data-store/components-configuration.json",       outName: "ui-components.md",       title: "UI Components Configuration" },
  { source: "dxh-data-store/client-api.json",                     outName: "client-api.md",          title: "ZDK Client API" },
  { source: "dxh-data-store/web-api.json",                        outName: "web-api.md",             title: "ZDK Web API" },
  { source: "dxh-data-store/web-api-8.0.json",                    outName: "web-api-v8.md",          title: "ZDK Web API (v8.0)" },
  { source: "dxh-data-store/modified_zdk.json",                   outName: "zdk.md",                 title: "ZDK Reference" },
  { source: "dxh-data-store/zrc.json",                            outName: "zrc.md",                 title: "ZRC (Zoho Request Client)" },
  { source: "dxh-data-store/zrc-widget.json",                     outName: "zrc-widget.md",          title: "ZRC for Widgets" },
  { source: "dxh-data-store/jssdk.json",                          outName: "widget-jssdk.md",        title: "Widget JS SDK" },
  { source: "dxh-data-store/widget-sdk-1.5.json",                 outName: "widget-sdk-v1.5.md",     title: "Widget SDK v1.5 (latest)" },
  { source: "dxh-data-store/event-dictionary.json",               outName: "event-dictionary.md",    title: "Event Dictionary" },
  { source: "dxh-data-store/event-dictionary-new.json",           outName: "event-dictionary-new.md",title: "Event Dictionary (new)" },
  { source: "dxh-data-store/widget-changelog.json",               outName: "widget-changelog.md",    title: "Widget SDK Changelog" },
];

let ok = 0, skip = 0, fail = 0;
for (const m of MAPPINGS) {
  const srcPath = join(RAW, m.source);
  if (!existsSync(srcPath)) {
    console.warn(`  skip (missing): ${m.source}`);
    skip++;
    continue;
  }
  try {
    const json = JSON.parse(readFileSync(srcPath, "utf8"));
    const md = looksLikeJsdoc(json) ? jsdocToMarkdown(m.title, json) : jsonToMarkdown(m.title, json);
    const outPath = join(REFS, m.outName);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, md, "utf8");
    console.log(`  ok: ${m.outName}  (${(md.length / 1024).toFixed(1)} KB)`);
    ok++;
  } catch (e) {
    console.error(`  FAIL ${m.source}: ${(e as Error).message}`);
    fail++;
  }
}

// インデックス生成
const indexLines: string[] = [
  "# zoho-slyteui references/ index",
  "",
  `生成日時: ${new Date().toISOString()}`,
  "",
  "| ファイル | 元データ | 用途 |",
  "|---|---|---|",
];
for (const m of MAPPINGS) {
  indexLines.push(`| \`${m.outName}\` | \`${m.source}\` | ${m.title} |`);
}
indexLines.push("", "## 自動生成について", "");
indexLines.push("これらは `02_R&D/zoho-slyteui-docs-sync/` の `pnpm run skill:sync` で再生成される。");
indexLines.push("");
indexLines.push("更新手順:");
indexLines.push("```");
indexLines.push("cd 02_R&D/zoho-slyteui-docs-sync");
indexLines.push("pnpm run inspect   # fingerprint_config.json から最新マニフェスト取得");
indexLines.push("pnpm run pull      # 全件再取得");
indexLines.push("pnpm run skill:sync # references/*.md 再生成");
indexLines.push("```");
writeFileSync(join(REFS, "INDEX.md"), indexLines.join("\n"), "utf8");

console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail}`);
console.log(`Wrote to ${REFS}`);
