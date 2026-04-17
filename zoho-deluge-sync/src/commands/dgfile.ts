/**
 * .dg ファイル形式
 * ----------------
 *   先頭の連続する `//!` 行はディレクティブ（メタデータ）。
 *   それ以降が Deluge 関数 body（wrapper の中身のみ。先頭末尾の {} は書かない）。
 *
 * ディレクティブ:
 *   //! api_name: aitest_ping        (省略時はファイル名)
 *   //! return_type: void            (default: void)
 *   //! params: [{"name":"demo","type":"STRING"}]   (default: [])
 *   //! args: {"demo":"hello"}       (execute 時の引数。default: {})
 *   //! expect status: success       (success|failure。default: success)
 *   //! expect log: ping             (部分一致。複数行可)
 *
 * 例:
 *   //! api_name: aitest_ping
 *   //! expect status: success
 *   //! expect log: ping from aitest_ping
 *   info "ping from aitest_ping";
 *   info "second log line";
 */
import { readFileSync, writeFileSync } from "node:fs";

export interface DgParam {
  name: string;
  type: string;
}

export interface DgFile {
  apiName: string;
  returnType: string;
  params: DgParam[];
  args: Record<string, unknown>;
  expectStatus: "success" | "failure";
  expectLogs: string[];
  body: string; // wrapper 中身のみ
}

export function parseDg(text: string, fallbackApiName: string): DgFile {
  const lines = text.split(/\r?\n/);
  const directives: string[] = [];
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\/!\s?/.test(ln)) {
      directives.push(ln.replace(/^\s*\/\/!\s?/, ""));
      bodyStart = i + 1;
    } else if (ln.trim() === "" && directives.length > 0 && bodyStart === i) {
      bodyStart = i + 1;
    } else {
      break;
    }
  }
  const body = lines.slice(bodyStart).join("\n").replace(/\n+$/g, "");

  const dg: DgFile = {
    apiName: fallbackApiName,
    returnType: "void",
    params: [],
    args: {},
    expectStatus: "success",
    expectLogs: [],
    body,
  };

  for (const d of directives) {
    const m = /^([a-zA-Z_]+(?:\s+[a-zA-Z_]+)?)\s*:\s*(.+)$/.exec(d.trim());
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    switch (key) {
      case "api_name":
        dg.apiName = val;
        break;
      case "return_type":
        dg.returnType = val;
        break;
      case "params":
        dg.params = JSON.parse(val);
        break;
      case "args":
        dg.args = JSON.parse(val);
        break;
      case "expect status":
        if (val === "success" || val === "failure") dg.expectStatus = val;
        break;
      case "expect log":
        dg.expectLogs.push(val);
        break;
    }
  }
  return dg;
}

export function readDg(path: string, fallbackApiName: string): DgFile {
  return parseDg(readFileSync(path, "utf8"), fallbackApiName);
}

/** リモートから取得した body と directives でファイルを書き戻す */
export function serializeDg(dg: DgFile): string {
  const lines: string[] = [];
  lines.push(`//! api_name: ${dg.apiName}`);
  if (dg.returnType !== "void") lines.push(`//! return_type: ${dg.returnType}`);
  if (dg.params.length) lines.push(`//! params: ${JSON.stringify(dg.params)}`);
  if (Object.keys(dg.args).length) lines.push(`//! args: ${JSON.stringify(dg.args)}`);
  lines.push(`//! expect status: ${dg.expectStatus}`);
  for (const e of dg.expectLogs) lines.push(`//! expect log: ${e}`);
  lines.push("");
  lines.push(dg.body);
  return lines.join("\n") + "\n";
}

export function writeDg(path: string, dg: DgFile) {
  writeFileSync(path, serializeDg(dg), "utf8");
}

/**
 * wrapped script ("void automation.NAME(...) { ... }") から body のみを抽出する
 */
export function extractBodyFromWrapped(wrapped: string): string {
  const m = /\{([\s\S]*)\}\s*$/.exec(wrapped);
  if (!m) return wrapped;
  return m[1].replace(/^\n/, "").replace(/\n\s*$/, "");
}
