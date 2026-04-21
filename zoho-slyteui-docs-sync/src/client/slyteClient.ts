import axios, { AxiosInstance } from "axios";

export interface SlyteClientConfig {
  baseUrl?: string;
}

/**
 * zohocrm.dev のドキュメントエンドポイントを叩くクライアント。
 * fingerprint_config.json で判明した通り、Developer Space のドキュメント系は
 * **認証不要・CORS フリー**（`access-control-allow-origin: *`）。
 * Cookie / CSRF / Org-ID は不要。
 */
export class SlyteDocClient {
  private readonly http: AxiosInstance;
  readonly baseUrl: string;

  constructor(cfg: SlyteClientConfig = {}) {
    this.baseUrl = cfg.baseUrl ?? "https://www.zohocrm.dev";
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 30_000,
      validateStatus: () => true,
      headers: {
        Accept: "*/*",
        "Accept-Language": "ja",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
        Referer: `${this.baseUrl}/explore/slyteui`,
      },
    });
  }

  /** path は先頭スラッシュあり ("/dxh-data-store/...") */
  async get<T = unknown>(path: string): Promise<{ status: number; data: T }> {
    const res = await this.http.get<T>(path);
    return { status: res.status, data: res.data };
  }

  async getText(path: string): Promise<{ status: number; text: string }> {
    const res = await this.http.get(path, {
      responseType: "text",
      transformResponse: [(d) => d],
    });
    return { status: res.status, text: typeof res.data === "string" ? res.data : String(res.data) };
  }

  /** fingerprint_config.json をルートから取得 */
  async fetchFingerprintConfig(): Promise<FingerprintConfig> {
    const res = await this.get<FingerprintConfig>("/fingerprint_config.json");
    if (res.status !== 200) {
      throw new Error(`fingerprint_config.json HTTP ${res.status}`);
    }
    return res.data;
  }
}

export interface FingerprintConfig {
  default: Record<string, FingerprintNode>;
  versions?: { version: string };
}

export type FingerprintNode = string | { [key: string]: FingerprintNode };
