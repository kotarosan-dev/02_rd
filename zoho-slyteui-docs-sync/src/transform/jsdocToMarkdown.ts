/**
 * Zoho Developer Space の client-api / web-api / modified_zdk / widget-sdk / jssdk / event-dictionary は
 * **JSDoc 出力形式** の JSON。各エントリは `{kind, name, longname, memberof, description, params, returns, examples, tags}` を持つ。
 *
 * これを namespace / class / member 単位でグルーピングして Markdown 化する。
 */

interface JsDocEntry {
  kind?: string; // "namespace" | "class" | "function" | "member" | "constant" | "typedef" | ...
  name?: string;
  longname?: string;
  memberof?: string;
  description?: string;
  comment?: string;
  scope?: string;
  undocumented?: boolean;
  access?: string;
  params?: Array<{ name?: string; description?: string; type?: { names?: string[] }; optional?: boolean; defaultvalue?: unknown }>;
  returns?: Array<{ description?: string; type?: { names?: string[] } }>;
  examples?: Array<string | { caption?: string; code?: string }>;
  tags?: Array<{ originalTitle?: string; title?: string; text?: string; value?: string }>;
  [key: string]: unknown;
}

function stripHtml(s: string | undefined): string {
  if (!s) return "";
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

function typeStr(t?: { names?: string[] }): string {
  return t?.names?.join(" | ") ?? "";
}

function renderEntry(e: JsDocEntry, lines: string[], baseLevel = 3): void {
  if (e.undocumented) return;
  const heading = "#".repeat(Math.min(Math.max(baseLevel, 1), 6));
  const sig = e.longname ?? e.name ?? "(anonymous)";
  const kindBadge = e.kind ? ` _(${e.kind})_` : "";
  lines.push(`${heading} \`${sig}\`${kindBadge}`);
  lines.push("");
  if (e.description) {
    lines.push(stripHtml(e.description));
    lines.push("");
  }
  if (e.params && e.params.length > 0) {
    lines.push("**Parameters:**");
    lines.push("");
    lines.push("| Name | Type | Description |");
    lines.push("|---|---|---|");
    for (const p of e.params) {
      const opt = p.optional ? " _(optional)_" : "";
      const def = p.defaultvalue !== undefined ? ` _(default: \`${String(p.defaultvalue)}\`)_` : "";
      lines.push(
        `| \`${p.name ?? ""}\`${opt} | \`${typeStr(p.type)}\` | ${stripHtml(p.description)}${def} |`,
      );
    }
    lines.push("");
  }
  if (e.returns && e.returns.length > 0) {
    lines.push("**Returns:**");
    lines.push("");
    for (const r of e.returns) {
      const t = typeStr(r.type);
      lines.push(`- ${t ? "`" + t + "` — " : ""}${stripHtml(r.description)}`);
    }
    lines.push("");
  }
  if (e.examples && e.examples.length > 0) {
    lines.push("**Examples:**");
    lines.push("");
    for (const ex of e.examples) {
      const code = typeof ex === "string" ? ex : ex.code ?? "";
      const cap = typeof ex === "string" ? "" : ex.caption ?? "";
      if (cap) {
        lines.push(stripHtml(cap));
        lines.push("");
      }
      lines.push("```javascript");
      lines.push(code);
      lines.push("```");
      lines.push("");
    }
  }
  // tags も拾う（supportedplatforms 等）
  if (e.tags && e.tags.length > 0) {
    const interesting = e.tags.filter(
      (t) => t.title && !["category", "memberof", "kind", "name", "scope"].includes(t.title),
    );
    if (interesting.length > 0) {
      for (const t of interesting) {
        lines.push(`- _${t.title}:_ ${stripHtml(t.value ?? t.text)}`);
      }
      lines.push("");
    }
  }
}

export function jsdocToMarkdown(title: string, root: unknown): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    "> 自動生成: `zoho-slyteui-docs-sync` から再生成。手動編集禁止。",
    "",
  ];

  // root の形は { "ZDK": [...] } / { "JS SDK": [...] } / [...] のどれか
  const sections: Array<[string, JsDocEntry[]]> = [];
  if (Array.isArray(root)) {
    sections.push(["Reference", root as JsDocEntry[]]);
  } else if (root && typeof root === "object") {
    for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
      if (Array.isArray(v)) sections.push([k, v as JsDocEntry[]]);
    }
  }

  for (const [secName, entries] of sections) {
    lines.push(`## ${secName}`);
    lines.push("");

    // memberof ごとにグルーピング
    const byMember = new Map<string, JsDocEntry[]>();
    const namespaces: JsDocEntry[] = [];
    for (const e of entries) {
      if (e.undocumented) continue;
      if (e.kind === "namespace" || e.kind === "class") namespaces.push(e);
      const key = e.memberof ?? "(global)";
      if (!byMember.has(key)) byMember.set(key, []);
      byMember.get(key)!.push(e);
    }

    // 名前空間定義を先に出す
    for (const ns of namespaces.sort((a, b) => (a.longname ?? "").localeCompare(b.longname ?? ""))) {
      renderEntry(ns, lines, 3);
    }

    // memberof 別の members
    const memberKeys = [...byMember.keys()].sort();
    for (const key of memberKeys) {
      const members = byMember.get(key)!.filter((e) => e.kind !== "namespace" && e.kind !== "class");
      if (members.length === 0) continue;
      lines.push(`### Members of \`${key}\``);
      lines.push("");
      for (const m of members.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))) {
        renderEntry(m, lines, 4);
      }
    }
  }

  return lines.join("\n");
}

/** 渡された root が JSDoc 形式かどうかをヒューリスティックで判定 */
export function looksLikeJsdoc(root: unknown): boolean {
  let entries: unknown[] = [];
  if (Array.isArray(root)) entries = root;
  else if (root && typeof root === "object") {
    for (const v of Object.values(root as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        entries = v;
        break;
      }
    }
  }
  if (entries.length === 0) return false;
  const sample = entries[0] as Record<string, unknown> | undefined;
  return !!sample && ("kind" in sample || "longname" in sample);
}
