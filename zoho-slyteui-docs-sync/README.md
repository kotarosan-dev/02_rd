# zoho-slyteui-docs-sync

Zoho **SlyteUI** ドキュメント (`https://www.zohocrm.dev/explore/slyteui/...`) を、
SPA が裏で叩いている **内部 API** から git-ops で全件取得・差分管理するツール。

最終的に `C:\Users\user\.claude\skills\zoho-slyteui\` スキルの
リファレンス自動生成基盤として使う。

## 関連スキル
- `zoho-deluge-internal-sync` — 同じ Cookie 認証パターンのリファレンス実装
- `zoho-crm-clientscript_widget` — フロントエンド SDK スキル（並列の関係）
- `zoho-harness` — 上位オーケストレーション

## ワークフロー

```
Phase 1: HAR 採取
  └─ DevTools の Network を Save all as HAR with content
     → _har/slyteui.har に配置

Phase 2: エンドポイント発見
  └─ pnpm run inspect -- _har/slyteui.har
     → src/endpoints.json に「再現可能な全エンドポイントのテンプレ」を出力

Phase 3: 全件取得
  └─ pnpm run pull
     → docs/_raw/*.json    （生レスポンス）
        docs/components/*.md（人間可読の Markdown）

Phase 4: スキル更新
  └─ pnpm run skill:sync
     → C:\Users\user\.claude\skills\zoho-slyteui\references\ を再生成
```

## セットアップ

```powershell
cd zoho-slyteui-docs-sync
pnpm install
cp .env.example .env
# DevTools から Cookie をコピーして .env に貼る
pnpm run inspect -- _har/slyteui.har
pnpm run pull
```

## .env

`.env.example` を参照。`zohocrm.dev` は通常の Web セッション Cookie のみで足りる想定
（CSRF トークンや Org-ID は不要の可能性が高い）が、HAR 解析後に追加が必要なら
`SLYTEUI_EXTRA_HEADERS` に JSON で書く。

## ディレクトリ

```
zoho-slyteui-docs-sync/
├─ _har/                  # HAR ファイル置き場（git ignore）
├─ src/
│  ├─ client/slyteClient.ts   # Cookie 付き低レベル fetch
│  ├─ inspect/                # HAR 解析・エンドポイント抽出
│  ├─ commands/pull.ts        # 全件取得
│  └─ cli/{inspect,pull,list}.ts
├─ scripts/                # 実験用スクリプト（probe-*.ts）
├─ docs/                   # 取得物（git 管理）
│  ├─ _raw/                # 生 JSON
│  ├─ overview/
│  ├─ ui-components/
│  ├─ zdk/
│  └─ zrc/
├─ src/endpoints.json      # 発見済みエンドポイント定義
├─ .env.example
├─ package.json
├─ tsconfig.json
└─ README.md
```
