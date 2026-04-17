# リスクログ（ToS / セキュリティ / 障害メモ）

## 1. ToS 上のスタンス

- このツールは **Zoho CRM の非公式内部 API** を叩く
- Zoho の Terms of Service には「自動化された手段で API 以外のエンドポイントにアクセスすることを禁ずる」旨の条項が含まれる可能性がある
- 商用クライアントへ導入する際は、**事前に書面で同意を得る**こと（テンプレ文言は SKILL.md に置く）
- **GHM 等本番 org への適用前チェックリスト**は Phase 7 を参照

## 2. 認証情報の取り扱い

- Cookie / CSRF token は本人のセッションそのもの。漏洩 = アカウント乗っ取り
- `.env` は dotenvx で必ず暗号化（`.env.vault` を git 管理、`.env.keys` は gitignore）
- ログ出力時は `maskHeaders()` を経由して Cookie / CSRF をマスク
- Chat / Slack / GitHub Issue に**生 Cookie を貼らない**。値が漏れた場合は即ログアウトしてセッション無効化

### インシデント記録

| 日付 | 概要 | 対応 |
|---|---|---|
| 2026-04-17 | プロジェクト初期検討時に生 Cookie 一式がチャット transcript に残った | 作業終了後ログアウト → 再ログインしてセッション無効化（要対応） |

## 3. 想定される障害シナリオ

| シナリオ | 兆候 | 対応 |
|---|---|---|
| Cookie 失効 | 401/403、または HTML（ログイン画面）が返る | ブラウザで再ログイン → `.env` の `ZOHO_COOKIE` / `ZOHO_CSRF_TOKEN` を更新 |
| CSRF mismatch | 403 + `INVALID_TOKEN` 系メッセージ | 上に同じ |
| org id 不一致 | 200 だが `AUTHENTICATION_FAILURE` 等 | `X-CRM-ORG` を再確認。Cookie の `zalb_zid` と一致しているか |
| Zoho 側仕様変更 | snapshot test が壊れる | 該当 endpoint を HAR で再キャプチャ → `endpoint-map.md` 更新 |
| レート制限 | 連続 429 | exponential backoff（zohoClient 側で実装予定）。pagination 間隔を空ける |
| Zoho メンテ | 5xx が頻発 | 平日 10–16 時に書き込みを限定（深夜帯は被りやすい） |

## 4. 本番書き込みガード

- `ZOHO_ALLOW_PROD_WRITE=1` を環境変数で明示しない限り、書き込み系メソッドは throw する（`zohoClient.ts` 実装済）
- 削除系は更に `--allow-delete` フラグ必須（CLI 実装時）
- dry-run 必須（送信予定 request を `docs/dry-runs/` に保存）
