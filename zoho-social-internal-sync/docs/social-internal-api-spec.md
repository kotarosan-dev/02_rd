# Zoho Social 内部 API 仕様書（リバース）

> **⚠️ 取扱注意 / 内輪専用**
> - 本仕様書は **kotarosan 自社 Portal 専用**。クライアント Portal や他人 Cookie を入れて運用しない。
> - 公式 API ではない。Zoho 側の UI 改修により予告なく壊れる前提。
> - skill 化・汎用配布禁止。

## 進捗

| Phase | 状態 |
| --- | --- |
| Phase 0: スキャフォルド | ✅ |
| Phase 1: HAR 採取（接続フロー） | ✅ `social_x_linkedin_connect.har`（4.5MB / 184 entries） |
| Phase 1: HAR 採取（書込フロー） | ✅ `social_c_draft_save.har` で draft API 確認 |
| Phase 2: 認証 / 読込 API 実装 | ✅ プローブ全 OK / `GetBrandsInfo` で channel ID 取得済み |
| Phase 3: 書込 API 実装 (draft / post / schedule) | ✅ MVP 完動。LinkedIn 個人で実投稿成功 |
| Phase 4: 削除 / メディアUP / 画像付き投稿 | ✅ delete / upload / 画像draft 完動 |
| Phase 4: 一覧 / Reports | ⏳ 個別 HAR 採取が必要 |

---

## ベース仕様

| 項目 | 値 |
| --- | --- |
| Base URL | `https://social.zoho.jp` |
| Portal Name | `kotarosan2` (URL路径用) |
| Brand ID | `2272000000011021` |
| Brand 表示名 | `kotarosan_` |
| URL パターン | `/social/{portalName}/{brandId}/{action}.do` |
| 拡張子 | `.do`（Servlet） |
| Content-Type (書込) | `application/x-www-form-urlencoded; charset=UTF-8` |
| CSRF | **Body に `cmcsrfparam=<value>`**（ヘッダではない！） |
| CSRF値の取得元 | Cookie 内の `cmcsr=<value>` と同値 |

### Network コードマップ

| network | サービス | CHANNELID | プロフィール |
| --- | --- | --- | --- |
| 2 | X (Twitter) | `2272000000017017` | kotarosan_ |
| 5 | Instagram | `2272000000059263` | kotarosan_ai_nocode |
| **10** | **LinkedIn 個人** | **`2272000000293043`** | **Kotaro Izumida** |
| 12 | (未接続) | - | - |

---

## 確認済みエンドポイント (45件、全て200)

### 読込系（GET）— 認証プローブ済み

| Path | 用途 | 確認 |
| --- | --- | --- |
| `getuserconfiguration.do` | ユーザー設定 | ✅ |
| `getlicenseconfiguration.do` | プラン情報 (`isPaidPlan`等) | ✅ |
| `GetBrandsInfo.do` | 全ブランド + Channel一覧（**重要**） | ✅ |
| `getbrandlayout.do` | ブランドレイアウト | - |
| `getsettingslayout.do` | 設定画面レイアウト | - |
| `getconnectiontemplates.do` | 接続可能なネットワーク一覧 | - |
| `getsocialchanneldashboard.do` | チャネルダッシュボード | - |
| `populatedashboardmetrics.do` | ダッシュボード指標（**Reports候補**） | - |
| `getbannerforpayments.do` / `getbannerforannouncement.do` / `getbannerforfreeplan.do` / `gettrailexpirebanner.do` / `gettryothereditionbanner.do` | 各種バナー（無視可） | - |
| `getbrandnotificationcount.do` | 通知件数 | - |
| `getemoji.do` | 絵文字一覧 | - |
| `getimagepreviewcontent.do` | 画像プレビュー | - |
| `getintegrationsconnecttemplate.do` | 連携テンプレ | - |
| `getlnprofileauthurl.do` | LinkedIn 認証 URL（接続フロー用） | - |
| `getnetworkconfig.do` / `getnetworklink.do` / `getNetworkURL.do` | ネットワーク設定 | - |
| `gettwittersettings.do` | Twitter 設定 | - |
| `getTwitterRetweetConfirmation.do` | Twitter リツイート確認設定 | - |
| `getpages.do` | ページ一覧（FB/LinkedInページ用） | - |
| `getprivatereplytemplate.do` | DM返信テンプレ | - |
| `getSavedData.do` | 保存済み投稿（**下書き候補**） | - |
| `loadCommontemplates.do` | 共通テンプレ | - |
| `networkTemplate.do` | ネットワークテンプレ | - |
| `getsocialcrmconfigurations.do` | SocialCRM 設定 | - |
| `ReachAjaxAction.do` | Reach（Listening/Monitoring用） | - |
| `reachuserinitialization.do` | Reach 初期化 | - |
| `getbundledservices.do` | バンドルサービス | - |
| `getdeskinfo.do` | Desk 連携 | - |
| `getlayoutcontent.do` | レイアウトコンテンツ | - |
| `getbrandconfigonboarding.do` | ブランド設定オンボード | - |
| `getonboardcontent.do` | オンボードコンテンツ | - |
| `/social/v2/locale/timezone` | タイムゾーン | - |
| `/social/getbadge.acs` | バッジ | - |

### 書込系（POST）

| Path | 用途 | Body 例 |
| --- | --- | --- |
| `addlnuser.do` | LinkedIn ユーザー追加（接続完了処理） | `prid={brandId}&network=10&cmcsrfparam=...` |
| `banneraction.do` | バナー操作 | - |
| `featuretracker.do` | 機能トラッキング（無視可） | - |
| `loggedinuser.do` | ログインユーザー記録 | - |
| `logger.do` | クライアントログ送信（無視可） | - |
| `checkactivesubscription.do` | サブスク確認 | - |
| `null/null/onezohoaction.do` | **404（Zoho側のバグ。無視）** | `action=getportals&...` |

### v2 投稿 API（✅ 確認済み）

**エンドポイント**: `POST /social/v2/post/drafts`

**ヘッダ**:
```
Content-Type: application/json
X-ZCSRF-TOKEN: cmcsrfparam=<csrf>
portal: 90000791817
brand_id: 2272000000011021
Cookie: ...
```

**ペイロード**:
```json
{
  "post": {
    "messages": [{
      "channels": [{"network": "linkedinprofile", "brand": "<BRAND_ID>", "poll": {}}],
      "message": "本文",
      "has_media": 0,
      "links": {}
    }],
    "schedule_time": <epoch_ms>,
    "type": 1,                 // ← 1=即時 / 2=予約 / 6=下書き
    "is_publish_now": true,    // 即時=true / 予約=false
    "created_time": <now_epoch_ms>,
    "post_from": 1,
    "timezone_str": "Asia/Tokyo"
  }
}
```

**レスポンス**:
```json
{"response":[{
  "success": true,
  "postid": "2272000000293067",
  "message": "reach.new.publish.popup.draft.success",  ← 成功時 type に関係なくこれ
  "networks": ["linkedinprofile"],
  "approval_needed": false,
  "brand_id": "2272000000011021"
}]}
```

⚠️ 罠: レスポンスメッセージは type に関係なく `"draft.success"`。実際にどう振る舞うかは `type` 値次第。

### 画像付き投稿（HAR より確定済み）

3 段階フロー:

1. **画像本体アップロード** `POST AttachmentUpload.do?action=add` (multipart/form-data)
   - フィールド: `cmcsrfparam`, `image_count`(連番), `spaceId`(=Portal ID = `90000791817`), `file`(バイナリ)
   - 応答: `{filename, response:"success", image_count, file_size, fileid}`
   - `attachment_url` は応答に含まれず、`/ViewProfilePicture.do?fileId=<fileid>` として **クライアント側で組み立てる**

2. **メディアライブラリ登録** `POST mediaAttachmentUpload.do` (form-urlencoded)
   - フィールド: `action=add`, `cmcsrfparam`, `medias=<JSON>`
   - `medias` は `[[{...img1}],[{...img2}]]`（1画像=1配列、それを配列で包む）
   - 内側オブジェクト: `{attachmentUrl, size, format, name, type, dimension, source:"0", created_time}`（**ここは camelCase の `attachmentUrl`**）
   - 応答: `{responseArray:[{attachmentUrl, mediaId, type}]}` （`mediaId` は投稿時には不要）

3. **投稿（drafts エンドポイント）** `POST /social/v2/post/drafts`
   - 本文 `messages[0].medias[]` に以下を入れる（**snake_case の `attachment_url`**）:
     ```json
     {
       "attachment_url": "/ViewProfilePicture.do?fileId=<fileid>",
       "size": 241344,
       "format": 1,
       "type": 1,
       "dimension": "744*337",
       "ispriority": true,
       "name": "testimage.png"
     }
     ```
   - `messages[0].has_media: 1` に変更
   - `dimension` は `"幅*高さ"` 文字列（クライアント側で画像から取得。サーバーには返ってこない）
   - `ispriority` は先頭画像のみ `true`、残りは省略可
   - `mediaId` / `created_time` / `source` は **不要**（含めると `EXTRA_KEY_FOUND_IN_JSON` で 400）

⚠️ 罠まとめ:
- 同じ `attachmentUrl` フィールドが `mediaAttachmentUpload.do` では camelCase、`v2/post/drafts` では snake_case (`attachment_url`)
- `dimension` をサーバーは返さないのに POST 時は必須
- 余計なキー（`mediaId` など）を1つでも入れると全体が 400 で弾かれる

### 書込系（未確認 — 別HARが必要）

| 機能 | 推測パス | 必要HAR |
| --- | --- | --- |
| 一覧取得 | `GET /social/v2/post/...` ? | 一覧画面のHAR |
| Reports | `populatedashboardmetrics.do` （プローブで200確認済み、構造未調査） | レポート画面HAR |

---

## 認証フロー詳細

### Cookie の必須キー

| Cookie 名 | 用途 |
| --- | --- |
| `JSESSIONID` | サーブレットセッション |
| `cmcsr` | **CSRF トークン（cmcsrfparam の元）** |
| `_iamadt`, `_iambdt`, `__Secure-iamsdt` | Zoho IAM 認証 |
| `wms-tkp-token` | チケット |
| `zalb_*` | ロードバランサ |
| `CSRF_TOKEN`, `CT_CSRF_TOKEN` | 別レイヤーのCSRF |

### 失効

- セッション失効まで概ね 24 時間〜数日
- 失効すると GET が HTML（ログインページ）を返すようになる
- 復旧: ブラウザでログインし直し → Cookie 再採取

---

## 既知の限界 / 罠

- `/null/null/onezohoaction.do` は **ブラウザ自身も 404 を受けている** バグ。気にしない。
- LinkedIn 会社ページは未接続。MVP は LinkedIn 個人（network=10）で進める。
- 投稿APIの真のパスは書込HARを採取するまで不明。
- Reports CSV/PDF は非同期ジョブの可能性。
