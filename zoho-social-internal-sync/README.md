# zoho-social-internal-sync

Zoho Social の **内部 API**（公式 Publishing API ではカバーされない領域）を、ブラウザの Cookie + `X-ZCSRF-TOKEN` を使って Node.js から叩くハーネス。

`harness_20260421_books` と同じ「HAR 採取 → リバース → CLI 化」流儀。
**当面の対象は LinkedIn 会社ページ**（投稿 / 予約 / 下書き / メディア / 一覧 / モニター / Reports / ブランド・チャンネル管理）。

> ⚠️ **kotarosan 自社 Portal 専用 / 内輪向け**。クライアント Portal や他人 Cookie で動かさない。skill 化・配布禁止。

## 進め方（フェーズ）

| Phase | 内容 | 担当 |
| --- | --- | --- |
| 0. Scaffold | このリポジトリ（雛形） | ✅ AI |
| 1. HAR 採取 | `docs/har-capture-procedure-social.md` の Scenario A〜H を実施 | 👤 ユーザー |
| 2. 解析 | `pnpm run t02:har` で `artifacts/social-endpoints.md` を生成、`docs/social-internal-api-spec.md` を埋める | 🤖 AI |
| 3. CLI 実装 | `scripts/cli/{draft,post,schedule,list,media,monitor,reports}.mjs` | 🤖 AI |
| 4. スモーク | `pnpm run t10:smoke`（下書き作成→削除のドライラン） | 🤖 AI |

## 使い方（Phase 1 完了後）

```powershell
cd zoho-social-internal-sync
pnpm install

# HAR 採取後に Cookie / CSRF / portal/brand/channel ID を抽出
node scripts/_extract_social_cookie.mjs docs/har/social_d_post_now.har

# 認証が活きているか最小プローブ
pnpm run t01:probe

# HAR から内部エンドポイント一覧を生成
pnpm run t02:har

# 下書き → 削除のスモーク
pnpm run t10:smoke
```

## ファイル

- `.env.social.example` … Cookie / CSRF / Portal/Brand/Channel ID テンプレ
- `docs/har-capture-procedure-social.md` … 採取手順書
- `docs/social-internal-api-spec.md` … 解析結果（埋めていく）
- `scripts/_social_lib.mjs` … fetch ラッパー（books_lib と同型）
- `scripts/_extract_social_cookie.mjs` … HAR → `.env.social`
- `scripts/t01_probe.mjs` … 認証プローブ
- `scripts/t02_har_extract.mjs` … エンドポイント抽出
- `scripts/t10_smoke_post.mjs` … 書込スモーク（雛形）

## セキュリティ

- `.env.social` / `docs/har/*.har` は `.gitignore` 済み。**絶対に commit しない**。
- Cookie は数日で失効する前提。失効したら Scenario D を再採取して再抽出。
- `dotenvx encrypt` での暗号化を推奨（既存リポジトリ運用に合わせる）。
