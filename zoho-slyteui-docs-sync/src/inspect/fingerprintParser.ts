import type { FingerprintNode, FingerprintConfig } from "../client/slyteClient.js";

export interface DiscoveredAsset {
  /** "/dxh-data-store/slyte-components-configuration_<hash>_.json" 形式の URL パス */
  url: string;
  /** ハッシュ抜きの相対パス（"dxh-data-store/slyte-components-configuration.json"） */
  logicalPath: string;
  /** ファイル名 */
  fileName: string;
  /** 拡張子（"json", "md", "zip" など） */
  ext: string;
  /** カテゴリ（manifest トップレベル: "dxh-data-store" / "crm_dxhub_resources" など） */
  category: string;
  /** さらに細かい区分（"client-script/Samples" など） */
  subCategory: string;
  /** ハッシュ値 */
  hash: string;
}

/**
 * fingerprint_config.json の `default` をフラット化して、
 * 取得可能な全アセットのリストを返す。
 *
 * `default.dxh-data-store.slyte-components-configuration.json: "ecf3f4..."` →
 * `/dxh-data-store/slyte-components-configuration_ecf3f4..._.json`
 */
export function flattenManifest(cfg: FingerprintConfig): DiscoveredAsset[] {
  const out: DiscoveredAsset[] = [];
  walk(cfg.default ?? {}, [], out);
  return out;
}

function walk(node: FingerprintNode, path: string[], out: DiscoveredAsset[]) {
  if (typeof node === "string") {
    // path[0] = category, path[1..-2] = sub, path[-1] = fileName
    if (path.length === 0) return;
    const fileName = path[path.length - 1];
    const dir = path.slice(0, -1);
    const ext = fileName.includes(".") ? fileName.split(".").pop()! : "";
    const baseFileName = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;
    const hash = node;
    const url = `/${[...dir, `${baseFileName}_${hash}_.${ext}`].join("/")}`;
    const category = dir[0] ?? "";
    const subCategory = dir.slice(1).join("/");
    out.push({
      url,
      logicalPath: [...dir, fileName].join("/"),
      fileName,
      ext,
      category,
      subCategory,
      hash,
    });
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    walk(v, [...path, k], out);
  }
}

export interface AssetFilter {
  categories?: string[];
  exts?: string[];
  pathIncludes?: string[];
  pathExcludes?: string[];
}

export function filterAssets(
  assets: DiscoveredAsset[],
  filter: AssetFilter = {},
): DiscoveredAsset[] {
  return assets.filter((a) => {
    if (filter.categories && !filter.categories.includes(a.category)) return false;
    if (filter.exts && !filter.exts.includes(a.ext)) return false;
    if (filter.pathIncludes && !filter.pathIncludes.some((p) => a.logicalPath.includes(p))) {
      return false;
    }
    if (filter.pathExcludes && filter.pathExcludes.some((p) => a.logicalPath.includes(p))) {
      return false;
    }
    return true;
  });
}
