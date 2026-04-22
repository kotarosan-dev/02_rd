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
  /**
   * 環境スコープ注釈。Markdown 冒頭に挿入される（自動生成で毎回上書きされても消えないように）。
   * SlyteUI / Client Script / Widget で使える API surface が異なるため、誤参照防止用に明示する。
   */
  scopeNote?: string;
}

const MAPPINGS: Mapping[] = [
  { source: "dxh-data-store/slyte-components-configuration.json", outName: "slyte-sidebar.md",       title: "SlyteUI Sidebar / Routes" },
  { source: "dxh-data-store/components-configuration.json",       outName: "ui-components.md",       title: "UI Components Configuration" },
  {
    source: "dxh-data-store/client-api.json",
    outName: "client-api.md",
    title: "ZDK Client API",
    scopeNote: [
      "⚠️ **環境互換性に注意**:",
      "- ✅ SlyteUI で使える: `ZDK.Client.*`（showAlert 等）, `ZDK.Page.*`（getField 等）, `$Page.*`（record_id 等）",
      "- ❌ SlyteUI で使えない: `ZDK.HTTP.*`, `ZDK.Apps.*`",
      "- ⚠️ `Field#setValue` は detail page では Mandatory form 内のみ動作。SlyteUI widget からは使えない（`unsupported action` になる）。レコード更新は `zrc.put` を使うこと。",
    ].join("\n"),
  },
  {
    source: "dxh-data-store/web-api.json",
    outName: "web-api.md",
    title: "ZDK Web API",
    scopeNote: [
      "⚠️ **このファイルは Client Script 専用 API のリファレンス**。",
      "**SlyteUI コンポーネント内では `ZDK.Apps.CRM.*` は存在しない**（undefined エラーになる）。",
      "SlyteUI でレコード CRUD したい場合は `zrc.md` の `zrc.put/post/get` を使うこと。",
      "Widget では `widget-sdk-v1.5.md` の `ZOHO.CRM.API.*` を使うこと。",
    ].join("\n"),
  },
  {
    source: "dxh-data-store/web-api-8.0.json",
    outName: "web-api-v8.md",
    title: "ZDK Web API (v8.0)",
    scopeNote: [
      "⚠️ **このファイルは Client Script 専用 API（v8.0）のリファレンス**。",
      "**SlyteUI コンポーネント内では `ZDK.Apps.CRM.*` は存在しない**。",
      "SlyteUI / Widget でレコード CRUD したい場合は `zrc.md` (SlyteUI) / `zrc-widget.md` (Widget) を使うこと。",
    ].join("\n"),
  },
  {
    source: "dxh-data-store/modified_zdk.json",
    outName: "zdk.md",
    title: "ZDK Reference",
    scopeNote: [
      "⚠️ **環境互換性に注意**:",
      "- ✅ SlyteUI で使える: `ZDK.Client.*`, `ZDK.Page.*`",
      "- ❌ SlyteUI で使えない: `ZDK.HTTP.*`, `ZDK.Apps.*`",
      "- SlyteUI でレコード CRUD は `zrc.md` の `zrc.put/post/get/patch/delete` を使うこと。",
    ].join("\n"),
  },
  {
    source: "dxh-data-store/zrc.json",
    outName: "zrc.md",
    title: "ZRC (Zoho Request Client)",
    scopeNote: [
      "✅ **SlyteUI コンポーネント内および Client Script 内で利用可能**。",
      "**SlyteUI でレコード CRUD する場合の唯一の手段**（`ZDK.Apps.CRM.*` は SlyteUI には存在しない）。",
      "Widget 用は別ファイル `zrc-widget.md` を参照。",
    ].join("\n"),
  },
  {
    source: "dxh-data-store/zrc-widget.json",
    outName: "zrc-widget.md",
    title: "ZRC for Widgets",
    scopeNote: "✅ **Widget (iframe) 用 ZRC**。SlyteUI コンポーネント用は `zrc.md` を参照。",
  },
  { source: "dxh-data-store/jssdk.json",                          outName: "widget-jssdk.md",        title: "Widget JS SDK", scopeNote: "✅ **Widget (iframe) 専用**。SlyteUI コンポーネントでは使えない。" },
  { source: "dxh-data-store/widget-sdk-1.5.json",                 outName: "widget-sdk-v1.5.md",     title: "Widget SDK v1.5 (latest)", scopeNote: "✅ **Widget (iframe) 専用**。SlyteUI コンポーネントでは `ZOHO.CRM.API.*` は使えない。" },
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
    let md = looksLikeJsdoc(json) ? jsdocToMarkdown(m.title, json) : jsonToMarkdown(m.title, json);
    if (m.scopeNote) {
      const lines = md.split("\n");
      const titleIdx = lines.findIndex((l) => l.startsWith("# "));
      const insertAt = titleIdx >= 0 ? titleIdx + 1 : 0;
      const block = ["", "> " + m.scopeNote.split("\n").join("\n> "), ""];
      lines.splice(insertAt, 0, ...block);
      md = lines.join("\n");
    }
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
