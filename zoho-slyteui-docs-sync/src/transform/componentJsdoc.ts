/**
 * Lyte UI / Crux Components の JS ソースに含まれる JSDoc から
 * `@componentProperty` `@condition` `@syntax` 等を抽出して Markdown 化する。
 *
 * 出典: https://www.zohocrm.dev/addons/@zoho/lyte-ui-component/dist/components/{name}.js
 *       https://www.zohocrm.dev/addons/@zohocrm/crux-components/dist/components/{name}.js
 */

export interface ComponentProperty {
  /** 例: "ltPropAppearance" */
  name: string;
  /** 例: "default | primary | secondary | success | failure | warning" */
  type: string;
  /** 例: "default" / undefined */
  defaultValue?: string;
  /** @input/@output の有無 */
  input: boolean;
  output: boolean;
  /** @condition <prop> <value> の組 */
  conditions: { prop: string; value: string }[];
  /** @version 3.1.0 等 */
  version?: string;
  /** その他のフリーテキスト */
  notes: string[];
}

export interface ComponentSyntaxSample {
  kind: string;
  code: string;
}

export interface ComponentDoc {
  componentName: string;
  description: string;
  domEvents: string[];
  utilities: string[];
  dependencies: string[];
  version?: string;
  properties: ComponentProperty[];
  syntaxSamples: ComponentSyntaxSample[];
}

/**
 * JS ソース全文から JSDoc コメントブロック (`/** ... *\/`) を抽出する。
 */
function extractJsdocBlocks(src: string): string[] {
  const blocks: string[] = [];
  const re = /\/\*\*([\s\S]*?)\*\//g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

/**
 * ブロック内の "* " プレフィックスを剥がして行配列にする。
 */
function blockLines(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\*\s?/, "").trimEnd())
    .filter((l) => l.length > 0);
}

/**
 * `@componentProperty {type} name=default` を解析して
 * { name, type, defaultValue } を返す。
 */
function parseComponentPropertyDecl(text: string):
  | { name: string; type: string; defaultValue?: string }
  | null {
  const m = text.match(/^\s*\{([^}]+)\}\s+([A-Za-z_][\w$]*)(?:\s*=\s*(.+))?\s*$/);
  if (!m) return null;
  return {
    type: m[1].trim(),
    name: m[2].trim(),
    defaultValue: m[3]?.trim(),
  };
}

/**
 * JS ソース全文から ComponentDoc を組み立てる。
 */
export function parseComponentSource(componentName: string, src: string): ComponentDoc {
  const doc: ComponentDoc = {
    componentName,
    description: "",
    domEvents: [],
    utilities: [],
    dependencies: [],
    properties: [],
    syntaxSamples: [],
  };

  const blocks = extractJsdocBlocks(src);
  for (const block of blocks) {
    const lines = blockLines(block);
    if (lines.length === 0) continue;

    let currentKind: "preamble" | "property" | "syntax" | null = "preamble";
    let currentProperty: ComponentProperty | null = null;
    let currentSyntaxKind = "";
    let currentSyntaxLines: string[] = [];
    let preambleLines: string[] = [];
    let depsBuffer: string | null = null;

    const flushSyntax = () => {
      if (currentSyntaxKind) {
        doc.syntaxSamples.push({
          kind: currentSyntaxKind,
          code: currentSyntaxLines.join("\n").trim(),
        });
      }
      currentSyntaxKind = "";
      currentSyntaxLines = [];
    };

    const flushProperty = () => {
      if (currentProperty) doc.properties.push(currentProperty);
      currentProperty = null;
    };

    for (const line of lines) {
      const m = line.match(/^@(\w+)\s*(.*)$/);
      let tag = "";
      if (m) {
        tag = m[1];
        const rest = m[2];

        switch (tag) {
          case "component":
            // @component lyte-button: コンポーネント名は既知なので何もしない
            break;
          case "version":
            if (currentProperty) currentProperty.version = rest;
            else doc.version = rest;
            break;
          case "utility":
            doc.utilities.push(...rest.split(",").map((s) => s.trim()).filter(Boolean));
            break;
          case "dependencies":
            depsBuffer = rest.trim();
            doc.dependencies.push(depsBuffer);
            break;
          case "domEvents":
            doc.domEvents.push(...rest.split(",").map((s) => s.trim()).filter(Boolean));
            break;
          case "componentProperty": {
            flushSyntax();
            flushProperty();
            const parsed = parseComponentPropertyDecl(rest);
            if (parsed) {
              currentProperty = {
                ...parsed,
                input: false,
                output: false,
                conditions: [],
                notes: [],
              };
              currentKind = "property";
            }
            break;
          }
          case "input":
            if (currentProperty) currentProperty.input = true;
            break;
          case "output":
            if (currentProperty) currentProperty.output = true;
            break;
          case "condition": {
            // @condition <prop> <value>
            const cm = rest.match(/^(\S+)\s+(.+)$/);
            if (currentProperty && cm) {
              currentProperty.conditions.push({ prop: cm[1], value: cm[2] });
            }
            break;
          }
          case "syntax":
            flushProperty();
            flushSyntax();
            currentSyntaxKind = rest || "default";
            currentKind = "syntax";
            break;
          default:
            // unknown tags — keep as note on current entity
            if (currentProperty) currentProperty.notes.push(`@${tag} ${rest}`);
            break;
        }
      } else {
        if (currentKind === "syntax") {
          currentSyntaxLines.push(line);
        } else if (currentKind === "preamble") {
          // タグが出る前のフリーテキストだけ description に蓄積
          preambleLines.push(line);
        } else if (depsBuffer !== null) {
          // 直前の @dependencies の継続行（パス等）
          const idx = doc.dependencies.indexOf(depsBuffer);
          if (idx !== -1) {
            doc.dependencies[idx] = `${depsBuffer} (${line.trim()})`;
            depsBuffer = doc.dependencies[idx];
          }
        } else if (currentProperty) {
          currentProperty.notes.push(line);
        }
      }

      // タグを処理した直後は preamble を打ち切る
      if (m && currentKind === "preamble") currentKind = null;
      // depsBuffer は次のタグでクリア
      if (m && tag !== "dependencies") depsBuffer = null;
    }

    // ブロック先頭のフリーテキストを description に
    if (preambleLines.length && !doc.description) {
      doc.description = preambleLines.join(" ");
    }

    flushProperty();
    flushSyntax();
  }

  // Collapse description whitespace
  doc.description = doc.description.replace(/\s+/g, " ").trim();
  // De-duplicate utilities/domEvents
  doc.utilities = Array.from(new Set(doc.utilities));
  doc.domEvents = Array.from(new Set(doc.domEvents));

  return doc;
}

/**
 * lt-prop の HTML 属性名（kebab-case）を返す。
 * 例: ltPropAppearance → lt-prop-appearance
 */
export function attrName(propName: string): string {
  return propName.replace(/([A-Z])/g, "-$1").toLowerCase();
}

/**
 * ComponentDoc を Markdown に変換。
 */
export function componentDocToMarkdown(doc: ComponentDoc): string {
  const lines: string[] = [];
  lines.push(`# \`<${doc.componentName}>\``);
  lines.push("");
  if (doc.description) {
    lines.push(`> ${doc.description}`);
    lines.push("");
  }
  if (doc.version) {
    lines.push(`- Version: ${doc.version}`);
  }
  if (doc.utilities.length) {
    lines.push(`- Utilities: ${doc.utilities.map((u) => `\`${u}\``).join(", ")}`);
  }
  if (doc.domEvents.length) {
    lines.push(`- DOM Events: ${doc.domEvents.map((e) => `\`${e}\``).join(", ")}`);
  }
  if (doc.dependencies.length) {
    lines.push(`- Dependencies:`);
    for (const d of doc.dependencies) {
      lines.push(`  - ${d}`);
    }
  }
  lines.push("");

  if (doc.properties.length) {
    lines.push("## Properties");
    lines.push("");
    lines.push("| HTML 属性 | Prop 名 | 型 | デフォルト | I/O | 条件 |");
    lines.push("|---|---|---|---|---|---|");
    for (const p of doc.properties) {
      const io =
        (p.input && p.output ? "in/out" : p.input ? "in" : p.output ? "out" : "—") +
        (p.version ? ` (v${p.version})` : "");
      const cond = p.conditions
        .map((c) => `\`${c.prop}\` = ${c.value}`)
        .join("<br>") || "—";
      const def = (p.defaultValue ?? "—").replace(/\|/g, "\\|");
      const type = p.type.replace(/\|/g, "\\|");
      lines.push(
        `| \`${attrName(p.name)}\` | \`${p.name}\` | ${type} | ${def} | ${io} | ${cond} |`,
      );
    }
    lines.push("");
  }

  if (doc.syntaxSamples.length) {
    lines.push("## Usage");
    lines.push("");
    for (const s of doc.syntaxSamples) {
      lines.push(`### ${s.kind}`);
      lines.push("");
      lines.push("```html");
      lines.push(s.code);
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}
