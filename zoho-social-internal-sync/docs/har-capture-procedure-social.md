# Zoho Social 内部 API HAR 採取手順書 (T02-A / Social)

## 目的

`social.zoho.com` の管理画面が叩いている内部 XHR を録画して、
**LinkedIn 会社ページ向けの 投稿 / 予約 / 下書き / メディアUP / 一覧 / モニター / Reports / ブランド・チャンネル管理 API** をリバースエンジニアリングする。

採取した HAR は `zoho-social-internal-sync/docs/har/` に置き、後続 T02 (`pnpm run t02:har`) で解析する。

---

## 0. 事前準備

- Chrome (または Edge) で `https://social.zoho.com/<portal>/home` にログイン済みであること
- 自社 Portal の管理者権限のあるアカウントで操作すること
- LinkedIn 会社ページが既に Social に接続済みであること（未接続なら先に接続）
- 投稿のテストに使ってよい LinkedIn 会社ページであること（誤投稿防止のため、本番運用ページではなくテスト用ページが望ましい）

### ⚠️ DevTools の必須設定（これが OFF だと HAR に Save の XHR が入らない）

1. F12 → Network タブ → **歯車アイコン (Settings)** をクリック
2. ✅ **"Preserve log"** を ON
3. ✅ **"Disable cache"** を ON
4. Network タブの Filter は **"All"** を選択
5. 右上の 3点メニュー → **"Big request rows"** にしておくと URL が見やすい

---

## 1. 採取手順（Chrome DevTools）

各シナリオで **別の HAR ファイル**として保存する。順番どおり実行。
保存は **右クリック → "Save all as HAR with content"**（"Include sensitive data" がある場合は ON）。

### Scenario A: ブランド / チャンネル一覧

1. Social → 左サイドバー **ブランド一覧** または 右上 **ブランド切替メニュー**
2. F12 → Network → 録画ON → Clear → 画面リロード
3. 録画OFF → `docs/har/social_a_brand_list.har`

### Scenario B: 投稿作成画面オープン

1. **「投稿」「Publish」または鉛筆アイコン**で投稿作成モーダルを開く
2. 録画ON → Clear
3. **LinkedIn 会社ページのチャンネルを選択**して Compose 画面を表示
4. 録画OFF → `docs/har/social_b_compose_open.har`

### Scenario C: 下書き保存

1. 投稿作成モーダルで本文に「`【HAR-TEST】draft <日付>`」と入力
2. 録画ON → Clear
3. **下書き / Save Draft** をクリック → 保存完了を待つ
4. 録画OFF → `docs/har/social_c_draft_save.har`

### Scenario D: 即時投稿

1. 新規投稿モーダルを開き、本文に「`【HAR-TEST】post-now <日付>`」
2. 録画ON → Clear
3. **今すぐ投稿 / Publish Now** をクリック → 完了通知を待つ
4. 録画OFF → `docs/har/social_d_post_now.har`
5. 投稿完了後、**LinkedIn 上から該当投稿を削除しておく**（テスト痕の掃除）

### Scenario E: 予約投稿

1. 新規投稿モーダルで本文「`【HAR-TEST】schedule <日付>`」
2. 録画ON → Clear
3. **予約 / Schedule** を選択 → 適当な未来日時（例: 翌日 09:00）→ 確定
4. 録画OFF → `docs/har/social_e_schedule.har`
5. 確定後、**Publishing Queue から該当予約を削除しておく**

### Scenario F: メディアアップロード

1. 新規投稿モーダルで **画像/動画アップロード**ボタン
2. 録画ON → Clear
3. 適当な軽量画像（1〜2枚、PNG/JPG）をアップロード → サムネイル表示まで待つ
4. （投稿はせずに）モーダルを閉じる、または下書き保存
5. 録画OFF → `docs/har/social_f_media_upload.har`

### Scenario G: 投稿一覧 + パフォーマンス取得

1. **Posts / 投稿履歴**タブを開く
2. 録画ON → Clear → 一覧をリロード
3. **既存の LinkedIn 投稿 1 件をクリックして詳細パネル / Insights を表示**
4. 録画OFF → `docs/har/social_g_posts_list.har`

### Scenario H: モニター + Reports

1. **Monitor / モニター**タブで LinkedIn の任意のコラム（メンション・コメント等）を表示
2. 録画ON → Clear → カラム再読込 → 1 件のコメントを開く
3. 続けて **Reports** タブを開き、LinkedIn の概要レポートを表示（CSV/PDF エクスポートはしなくてよい）
4. 録画OFF → `docs/har/social_h_monitor_reports.har`

---

## 2. 配置先

```
zoho-social-internal-sync/
└─ docs/
   └─ har/
      ├─ social_a_brand_list.har
      ├─ social_b_compose_open.har
      ├─ social_c_draft_save.har
      ├─ social_d_post_now.har
      ├─ social_e_schedule.har
      ├─ social_f_media_upload.har
      ├─ social_g_posts_list.har
      └─ social_h_monitor_reports.har
```

`docs/har/*` は **絶対に commit しない**（Cookie / CSRF / 投稿本文が含まれる）。
`.gitignore` に既に追加済み。

---

## 3. 採取後にユーザーが実施すること

1. HAR ファイルを上記パスに配置
2. ターミナルで:
   ```powershell
   cd zoho-social-internal-sync
   pnpm install
   node scripts/_extract_social_cookie.mjs docs/har/social_d_post_now.har
   ```
3. `.env.social` が生成されたら、チャットに「**HAR 配置完了**」と伝える
4. 以降は AI 側で T02 (HAR 解析 → 内部 API 仕様抽出) と T10 (スモーク) を進める

---

## 4. シナリオが期待どおりに動かない場合


| 症状                              | 対応                                                                |
| ------------------------------- | ----------------------------------------------------------------- |
| LinkedIn が接続されていない              | 先に Settings → Channels → LinkedIn を接続                              |
| Save 時に 401 / 403               | ログインし直す（Cookie が古い / セッション切れ）                                     |
| HAR が 50MB を超える                 | 録画開始前に Network タブで Filter "Fetch/XHR" のみに絞る                       |
| HAR に Cookie が入らない              | "Save all as HAR with content" の **"Include sensitive data"** を確認 |
| 採取後に extract で brandId が取れない    | Scenario A の HAR を `_extract_social_cookie.mjs` の引数に渡して再抽出        |
| Scenario E でスケジュール枠が選択肢に出ない     | LinkedIn 接続のスコープ不足。再接続 / オーナー権限を確認                                |


---

## 5. 解析側で抽出するもの (T02 で実施)

各 HAR から下記を取り出して `docs/social-internal-api-spec.md` に表形式で整理:


| 項目                 | 期待                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------- |
| URL (path + query) | `https://social.zoho.com/api/v1/...` 系                                                   |
| Method             | GET/POST/PUT/DELETE                                                                      |
| 必須 Headers         | `X-ZCSRF-TOKEN` / `X-Brand-Id` / `X-Requested-With` 等                                    |
| Cookie の必須キー       | JSESSIONID / iamcsr / その他 zsocial_* 系                                                    |
| Body 構造            | JSON or form (multipart for media)                                                       |
| Response 構造        | id / status / scheduledTime / insights 等                                                 |
| 8 種マッピング           | brand-list / compose-open / draft / post-now / schedule / media / posts-list / monitor+reports |


---

## 6. セキュリティ注意

- このリポジトリ全体が **自社 Portal 専用**。他社 Portal や個人 LinkedIn の Cookie を入れない。
- `.env.social` は `.gitignore` 済みだが、`dotenvx encrypt` で暗号化して保管推奨。
- Cookie は概ね 24 時間〜数日で失効。失効したら Scenario D を再採取して `extract:cookie` を再実行。
- 内部 API は予告なく変わる。CI には乗せず、手動運用に留める。
