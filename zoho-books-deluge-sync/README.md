# zoho-books-deluge-sync

Zoho **Books** の Custom Function（Workflow Automation 用 Deluge 関数）を、内部 API 経由で **git-ops 管理** するための CLI ツール。

> ## ⚠️ 利用範囲（厳守）
>
> - **自社 Org（kotarosan）専用**。クライアント Org への適用禁止。
> - **skill 化・汎用配布禁止**。他人が顧客環境に持ち込むリスク回避のため。
> - 他人の Cookie / CSRF を使うアクセスは **不正アクセス禁止法**に抵触する可能性。
> - 公式 OAuth API ではなく **内部 API + Cookie 認証 + Chrome UA 偽装** に依存。Zoho 側の仕様変更で予告なく壊れる前提で運用すること。
>
> CRM 側の `zoho-deluge-sync` と同じスタンス。詳細仕様: [`docs/internal-api-spec.md`](./docs/internal-api-spec.md)

---

## 機能

| Command | 概要 |
|---|---|
| `pnpm smoke` | 認証3点セット (Cookie + CSRF + Chrome UA) の疎通確認 |
| `pnpm ls` | 全 Custom Function を一覧表示（`list` は pnpm 組み込みと衝突するため `ls`） |
| `pnpm pull` | リモート全関数を `deluge/<entity>/<name>.dg` + `.meta.json` に dump |
| `pnpm push <name>` | ローカル `.dg` をリモートに反映（save only） |
| `pnpm try <name> [<sample_id>]` | save + 即実行 → `info` 出力を表示（**TDD ループの主役**） |
| `pnpm exec <name> [<sample_id>]` | リモートの現在のスクリプトをそのまま実行（save しない） |
| `pnpm create <name> --entity <e> [--from <tpl.dg>]` | 新規関数を作成 + ローカルに dump |
| `pnpm delete <name> [--confirm]` | リモート + ローカル削除（`--confirm` なしは dry-run） |

## セットアップ

```powershell
cd zoho-books-deluge-sync
pnpm install

# テンプレートをコピーして編集
cp .env.books.example .env.books
# → Cookie / CSRF を Chrome DevTools から貼り付け

# 疎通確認
pnpm smoke
```

### .env.books の取得手順

1. Chrome で `https://books.zoho.jp/app/<org_id>/integrations/customfunctions` を開く
2. F12 → Network → 任意の `/api/v3/integrations/customfunctions` リクエストをクリック
3. **Headers > Request Headers** から:
   - `Cookie:` の値全文 → `ZOHO_BOOKS_COOKIE=`
   - `X-ZCSRF-TOKEN:` の値（`zbcsparam=...` 形式）→ `ZOHO_BOOKS_CSRF_TOKEN=`

> Cookie / CSRF は数時間〜半日で失効します。失効したら `code 1071: ReAuthentication needed` が出るので、ブラウザで Books のページを開き直して採取し直してください。

## TDD ループ

```powershell
# 1. リモートを全部 pull
pnpm pull

# 2. ローカルで deluge/invoice/my_function.dg を編集

# 3. 反映 + 即テスト実行
$env:ZOHO_BOOKS_ALLOW_PROD_WRITE = "1"
pnpm try my_function

# → execution_response.log_message に Deluge の info 出力が表示される
# → エラーがあれば exception/trace フィールドも自動表示
```

`pnpm try` 1 発で「save → execute → log 表示」が完結します（CRM の `actions/test` と違い、Books は PUT 1 回で全部やってくれる）。

## ファイルレイアウト

```
deluge/
├── invoice/
│   ├── my_function.dg          # Deluge 本体（CRM と違い wrap 不要、生コード）
│   └── my_function.meta.json   # id, entity, language, return_type, etc.
├── estimate/
└── bill/
```

## 安全ガード

- 書き込み系 CLI (`push`, `try`, `exec`, `create`, `delete`) は `ZOHO_BOOKS_ALLOW_PROD_WRITE=1` がないと拒否
- `delete` は `--confirm` がないと dry-run
- `.env.books`, `*.har`, `node_modules/` は `.gitignore` 済み

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `code 1071: ReAuthentication needed` | UA が node のまま OR Cookie 失効 | UA は本ツール込み済み。Cookie を再採取 |
| `code 12: organization_id should not occur more than 1 times.` | 内部実装ミス | `booksClient.mjs` の `call()` を確認 |
| `code 5: Invalid URL Passed` | endpoint パス間違い / 機能未提供 | `docs/internal-api-spec.md` 参照 |
| `HTTP 401` | Cookie が完全に失効 | ブラウザで Books に再ログイン → Cookie 取り直し |
| `HTTP 400` で create/update が失敗 | `entity` の値が不正、`script` 構文エラー | レスポンス body を確認 |

## 既知の制約（PoC 範囲）

- ✅ Custom Function (Workflow Custom Function) の CRUD + execute
- ❌ Custom Schedule の CRUD（HAR 未採取）
- ❌ Custom Button の CRUD（HAR 未採取）
- ❌ 過去実行履歴の logs エンドポイント（4 候補すべて 404 — TDD 用途では `try` の execution_response で代用可）
- 同期は手動。CI 自動同期は未実装

## 参考実装
- 兄弟ツール: [`../zoho-deluge-sync`](../zoho-deluge-sync) — CRM Deluge 用（同じ思想）
- 内部 API 調査: [`../harness_20260421_books`](../harness_20260421_books)
