/**
 * Zoho Developer Space の dxh-data-store JSON を **汎用再帰** で Markdown 化する。
 * - オブジェクトのキーは見出しに
 * - 配列は要素ごとに展開（要素に `name` があればそれを見出しに）
 * - `description` / `note` / `summary` / `value` / `code` / `output` はテキスト/コードブロックに
 * - `sampleAndOutput[]` は code/output ブロックに（zrc.json 形式）
 *
 * JSDoc 形式 (`{kind, longname, params, returns, ...}`) は jsdocToMarkdown で別処理。
 */

const KEY_TEXT = new Set(["description", "summary", "note", "value", "help_link"]);
const KEY_CODE = new Set(["code", "output", "sample"]);
const SKIP_KEYS = new Set(["uniqueName", "comment", "meta", "scope", "memberof", "longname", "kind"]);

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<a [^>]*href=['"]([^'"]+)['"][^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
    .replace(/<\/?(b|strong)>/gi, "**")
    .replace(/<\/?(i|em)>/gi, "*")
    .replace(/<code>([^<]*)<\/code>/gi, "`$1`")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .trim();
}

function h(level: number): string {
  return "#".repeat(Math.min(Math.max(level, 1), 6));
}

function isPrimitive(v: unknown): v is string | number | boolean | null {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function renderSampleAndOutput(arr: unknown[], lines: string[]) {
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const s = item as { name?: string; code?: string; output?: string; language?: string };
    if (s.name) {
      lines.push(`**${stripHtml(String(s.name))}**`);
      lines.push("");
    }
    if (s.code) {
      lines.push("```" + (s.language ?? "javascript"));
      lines.push(String(s.code));
      lines.push("```");
      lines.push("");
    }
    if (s.output) {
      lines.push("Output:");
      lines.push("");
      lines.push("```json");
      lines.push(String(s.output));
      lines.push("```");
      lines.push("");
    }
  }
}

function renderValue(value: unknown, level: number, label: string | null, lines: string[]) {
  if (value === undefined || value === null) return;

  if (isPrimitive(value)) {
    if (label) {
      lines.push(`- **${label}**: ${stripHtml(String(value))}`);
    } else {
      lines.push(stripHtml(String(value)));
      lines.push("");
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return;
    if (label === "sampleAndOutput") {
      renderSampleAndOutput(value, lines);
      return;
    }
    // primitive array
    if (value.every(isPrimitive)) {
      if (label) lines.push(`- **${label}**: ${value.map((v) => String(v)).join(", ")}`);
      else for (const v of value) lines.push(`- ${stripHtml(String(v))}`);
      lines.push("");
      return;
    }
    // array of objects: render each
    if (label) {
      lines.push(`${h(level)} ${label}`);
      lines.push("");
    }
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        renderObject(item as Record<string, unknown>, level + 1, lines);
      } else {
        renderValue(item, level + 1, null, lines);
      }
    }
    return;
  }

  // object
  if (label) {
    lines.push(`${h(level)} ${label}`);
    lines.push("");
  }
  renderObject(value as Record<string, unknown>, level + 1, lines);
}

function renderObject(obj: Record<string, unknown>, level: number, lines: string[]) {
  // 1) name があれば見出しにする
  const name = obj["name"] ?? obj["title"];
  if (typeof name === "string" && name.trim()) {
    lines.push(`${h(level)} ${stripHtml(name)}`);
    lines.push("");
  }

  // 2) テキスト系フィールドを順番に
  for (const k of ["description", "summary", "value"]) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) {
      lines.push(stripHtml(v));
      lines.push("");
    }
  }
  if (typeof obj["note"] === "string" && (obj["note"] as string).trim()) {
    lines.push(`> **Note:** ${stripHtml(obj["note"] as string)}`);
    lines.push("");
  }

  // 3) sampleAndOutput
  if (Array.isArray(obj["sampleAndOutput"])) {
    renderSampleAndOutput(obj["sampleAndOutput"] as unknown[], lines);
  }

  // 4) code / output 直書き
  if (typeof obj["code"] === "string") {
    lines.push("```javascript");
    lines.push(obj["code"] as string);
    lines.push("```");
    lines.push("");
  }
  if (typeof obj["output"] === "string") {
    lines.push("Output:");
    lines.push("");
    lines.push("```json");
    lines.push(obj["output"] as string);
    lines.push("```");
    lines.push("");
  }

  // 5) 残りの primitive を箇条書き
  const handled = new Set(["name", "title", "description", "summary", "value", "note", "sampleAndOutput", "code", "output", "children"]);
  const primitives: Array<[string, unknown]> = [];
  for (const [k, v] of Object.entries(obj)) {
    if (handled.has(k) || SKIP_KEYS.has(k)) continue;
    if (isPrimitive(v)) primitives.push([k, v]);
  }
  if (primitives.length > 0) {
    for (const [k, v] of primitives) {
      lines.push(`- **${k}**: ${stripHtml(String(v))}`);
    }
    lines.push("");
  }

  // 6) 残りの object/array を再帰
  for (const [k, v] of Object.entries(obj)) {
    if (handled.has(k) || SKIP_KEYS.has(k)) continue;
    if (isPrimitive(v)) continue;
    renderValue(v, level + 1, k, lines);
  }

  // 7) children は最後（ツリー継続）
  if (obj["children"]) {
    const c = obj["children"];
    if (Array.isArray(c)) {
      for (const child of c) {
        if (child && typeof child === "object") renderObject(child as Record<string, unknown>, level + 1, lines);
      }
    } else if (typeof c === "object") {
      for (const child of Object.values(c as Record<string, unknown>)) {
        if (child && typeof child === "object") renderObject(child as Record<string, unknown>, level + 1, lines);
      }
    }
  }
}

export function jsonToMarkdown(title: string, root: unknown): string {
  const lines: string[] = [`# ${title}`, "", `> 自動生成: \`zoho-slyteui-docs-sync\` から再生成。手動編集禁止。`, ""];

  if (Array.isArray(root)) {
    for (const item of root) {
      if (item && typeof item === "object") renderObject(item as Record<string, unknown>, 2, lines);
      else renderValue(item, 2, null, lines);
    }
  } else if (root && typeof root === "object") {
    for (const [topKey, value] of Object.entries(root as Record<string, unknown>)) {
      lines.push(`## ${topKey}`);
      lines.push("");
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === "object") renderObject(item as Record<string, unknown>, 3, lines);
            else renderValue(item, 3, null, lines);
          }
        } else {
          renderObject(value as Record<string, unknown>, 3, lines);
        }
      } else {
        renderValue(value, 3, null, lines);
      }
    }
  } else {
    lines.push("```json");
    lines.push(JSON.stringify(root, null, 2));
    lines.push("```");
  }

  return lines.join("\n");
}
