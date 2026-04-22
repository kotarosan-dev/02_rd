/**
 * docs/_raw/components-source/{lyte,crux}/*.js を JSDoc 解析して
 * ~/.claude/skills/zoho-slyteui/references/components/{lyte,crux}/{name}.md を生成。
 *
 * これが個別コンポーネント（lyte-button / lyte-input / crm-create-form 等）の
 * Props / 使用例の唯一の正本。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { componentDocToMarkdown, parseComponentSource } from "../transform/componentJsdoc.js";

const SKILL_ROOT = join(homedir(), ".claude", "skills", "zoho-slyteui");
const REFS = join(SKILL_ROOT, "references", "components");
const RAW = resolve("docs/_raw", "components-source");

if (!existsSync(RAW)) {
  console.error(`components-source not found. Run \`pnpm run pull:components\` first.`);
  process.exit(1);
}

interface IndexRow {
  group: string;
  name: string;
  size: number;
  propCount: number;
  syntaxCount: number;
}

const indexRows: IndexRow[] = [];

function processGroup(group: "lyte" | "crux") {
  const dir = join(RAW, group);
  if (!existsSync(dir)) return;
  const outDir = join(REFS, group);
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  for (const f of files) {
    const compName = basename(f, ".js");
    const src = readFileSync(join(dir, f), "utf8");
    const doc = parseComponentSource(compName, src);
    const md = componentDocToMarkdown(doc);
    const outPath = join(outDir, `${compName}.md`);
    writeFileSync(outPath, md, "utf8");
    indexRows.push({
      group,
      name: compName,
      size: md.length,
      propCount: doc.properties.length,
      syntaxCount: doc.syntaxSamples.length,
    });
    console.log(
      `  ok ${group}/${compName}.md  (${(md.length / 1024).toFixed(1)} KB, ${doc.properties.length} props)`,
    );
  }
}

processGroup("lyte");
processGroup("crux");

// Index ファイル
const lines: string[] = [
  "# zoho-slyteui references/components/ index",
  "",
  `生成日時: ${new Date().toISOString()}`,
  "",
  "個別コンポーネントの Props・使用例。出典は",
  "`https://www.zohocrm.dev/addons/@zoho/lyte-ui-component/dist/components/{name}.js`",
  "（および `@zohocrm/crux-components/...`）の **JSDoc 解析**。",
  "",
];

for (const group of ["lyte", "crux"] as const) {
  const rows = indexRows.filter((r) => r.group === group);
  if (rows.length === 0) continue;
  lines.push(`## ${group}-ui-component (${rows.length} 件)`);
  lines.push("");
  lines.push("| コンポーネント | Props 数 | Syntax 例 | サイズ |");
  lines.push("|---|---|---|---|");
  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| [\`${r.name}\`](${group}/${r.name}.md) | ${r.propCount} | ${r.syntaxCount} | ${(r.size / 1024).toFixed(1)} KB |`);
  }
  lines.push("");
}

writeFileSync(join(REFS, "INDEX.md"), lines.join("\n"), "utf8");

console.log(
  `\nDone. ${indexRows.length} component refs written to ${REFS}`,
);
