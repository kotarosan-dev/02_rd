# zoho-deluge-sync

Zoho CRM の **Deluge Function / Client Script / Workflow** を、ブラウザ UI が裏で叩いている**内部 API** 経由で取得・更新し、git でバージョン管理するツール。

> ⚠ **重要**: このツールは Zoho の公式 REST API ではなく、**ブラウザ UI が利用している非公式エンドポイント**を直接叩きます。ToS 上グレーであることを理解した上で、責任の所在を明確にして利用してください。詳細は [`docs/risk-log.md`](docs/risk-log.md)。

## ステータス

- [x] **Phase 0**: プロジェクト初期化、Cursor rules、台帳テンプレ
- [x] **Phase 1 (準備)**: `zohoClient.ts` axios wrapper、`smoke-test.ts` で GET 疎通確認
- [ ] Phase 1 実行（=この README の「セットアップ」を実施して `pnpm run smoke` が通る）
- [ ] **Phase 2**: HAR から書き込み系 endpoint を台帳化
- [ ] **Phase 3**: Read 側完成（全関数を `.ds` ファイルに dump）
- [ ] **Phase 4**: Write 側（dry-run + 1 関数 update）
- [ ] **Phase 5**: git-ops 化（pull / diff / push / status + GitHub Actions）
- [ ] **Phase 6**: Playwright で Cookie/CSRF 自動更新
- [ ] **Phase 7**: SKILL.md 化

## セットアップ（Phase 1 疎通まで）

```bash
cd zoho-deluge-sync
pnpm install                       # 依存導入
pnpm dotenvx ext keypair           # .env.keys / .env.vault 用キー生成
cp .env.example .env

# Chrome DevTools で取得した値を .env に書き込む
# - ZOHO_COOKIE        : Request Headers の cookie 全文
# - ZOHO_CSRF_TOKEN    : Request Headers の x-zcsrf-token （"crmcsrfparam=..." 形式）
# - ZOHO_ORG_ID        : Request Headers の x-crm-org
# - ZOHO_BASE_URL      : 例 https://crm.zoho.jp

# 暗号化（任意。最初は素の .env で動作確認してから）
pnpm dotenvx encrypt

# 疎通確認
pnpm run smoke
```

`HTTP 200` と `OK: retrieved N function(s).` が出れば Phase 1 クリア。

### よくある失敗

| 兆候 | 原因 | 対処 |
|---|---|---|
| `HTTP 401` / `HTTP 403` | Cookie or CSRF が失効 | ブラウザで再ログイン → `.env` を更新 |
| `response is not JSON` | ログイン画面に redirect された | 上に同じ |
| `missing env vars: ...` | `.env` が読めていない | `pnpm run smoke` ではなく `pnpm run smoke:plain` を試す（dotenvx を経由しない） |

## ディレクトリ構成

```
zoho-deluge-sync/
├── .cursor/rules/zoho-internal-api.mdc   # Cursor 常時適用ルール（最重要）
├── .env.example                          # 値の形式メモ
├── docs/
│   ├── endpoint-map.md                   # 発見したエンドポイント台帳
│   ├── request-captures/                 # HAR / 生 request/response（gitignore）
│   ├── dry-runs/                         # 送信予定 request のダンプ（gitignore）
│   ├── error-log/                        # 失敗 response のダンプ（gitignore）
│   └── risk-log.md                       # ToS / インシデント記録
├── src/
│   ├── auth/        # Phase 6: Playwright で Cookie 更新
│   ├── client/      # zohoClient.ts (axios wrapper)
│   ├── resources/   # functions / clientScripts / workflows
│   ├── cli/         # Phase 5: pull/diff/push CLI
│   └── types/       # Zoho 内部 API の型定義
├── scripts/
│   └── smoke-test.ts   # Phase 1 疎通確認
└── tests/
    └── __snapshots__/  # response schema snapshot
```

## 設計原則

詳細は [`.cursor/rules/zoho-internal-api.mdc`](.cursor/rules/zoho-internal-api.mdc)。要約：

1. **書き込み系は dry-run 必須**。送信予定 request は `docs/dry-runs/` に保存
2. 本番書き込みは `ZOHO_ALLOW_PROD_WRITE=1` がない限り throw
3. 削除系は更に `--allow-delete` フラグ必須
4. レスポンスは snapshot test で固定し、Zoho 側の仕様変更を CI で検知
5. シークレットは dotenvx 経由のみ。ログでは Cookie / CSRF を必ずマスク
```
