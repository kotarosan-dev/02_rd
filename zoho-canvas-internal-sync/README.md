# zoho-canvas-internal-sync

Zoho CRM Canvas（HomeView / ListView / DetailView）を git-ops 管理する PoC リポジトリ。

## ⚡ 重要な知見（2026-04-27 実機確認 — 最終確定版）

### 1. 公式OAuth Bearerで Canvas CRUD すべて通る

公式ドキュメント未掲載だが本番運用可能：

```
Endpoint: https://www.zohoapis.{TLD}/crm/v8/settings/canvas/views
Scope:    ZohoCRM.settings.ALL  ← これ1つで足りる（canvas.ALL は invalid_scope）
Auth:     Authorization: Zoho-oauthtoken {access_token}  (Client Credentials Flow)
```

実機結果（kotarosan 本番Org / `accounts.zoho.jp`）：

| 操作 | 結果 |
|------|------|
| POST 作成 | 201 SUCCESS |
| GET 一覧 / 詳細 | 200 / 204 |
| PUT 更新（name 反映確認済） | 200 SUCCESS |
| DELETE | 200 SUCCESS |

→ **本番運用は公式 OAuth で行うべき**。内部API（Cookie+CSRF）はバックアップ経路として残す。

### 2. クロスOrgデプロイ実証済み

「**GUI で1回設計 → API で他Orgに完全展開**」のフルパイプラインが成立：

| ステップ | 経路 | 結果 |
|---|---|---|
| ① Demo Org でGUI設計（`詳細テンプレート1`, 330ノード, 139KB） | 手動 | 完成 |
| ② Demo Org からpull | 内部API GET `?parsed=false` | 200, 139588 bytes |
| ③ 同Orgで別名クローン | 内部API POST | 201, 視覚的にも完全一致 ✅ |
| ④ **本番Orgへ クロスOrgクローン** | **OAuth POST + module.id/layout.id 置換** | **201, GET=200/139617 bytes, DELETE=200** ✅ |

→ Etika 案件等で「Sandbox で設計したCanvasを本番に展開」「複数テナントへ同一デザインを横展開」が公式OAuthだけで完結する。

### 3. CLI: `npm run deploy`（クロスOrgデプロイ用）

```bash
# 既定（.env の ZOHO_ORG_ID 宛にデプロイ。元JSONの module/layout を自動remap）
node scripts/deploy.mjs <pulled_canvas.json> --name "<新名>"

# dry-run（送信せずにペイロードのみ生成）
node scripts/deploy.mjs <pulled_canvas.json> --name "test" --dry-run

# 別Org / 別モジュール / 別レイアウト指定
node scripts/deploy.mjs <pulled_canvas.json> --name "tenant_A_v1" \
  --target-org 90001234567 --module Leads --layout Standard
```

`.env`（このリポ）に内部API用のCookie/CSRF、親 `02_R&D/.env` にOAuth資格情報（`ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` / `ZOHO_ORG_ID` / `ZOHO_DC`）を置けば自動で両方ロードされる。

## 2系統のクライアント

このリポジトリは2つの認証経路を提供する：

1. **`scripts/lib/client.mjs`** — 内部API（Cookie + CSRF）
   - 公式OAuthが使えない環境のフォールバック
   - セッション期限で失効するため運用には不向き
2. **OAuth Bearer 経路（推奨・本番運用向け）**
   - `scripts/probe-oauth-crud.mjs` がリファレンス実装
   - `.env` の `ZOHO_CLIENT_ID/SECRET/ORG_ID/DC` だけで動く（zoho-api-access スキル準拠）

## ⚠️ 注意（両経路共通）

- POST 時、`children` は **最低1個のコンポーネント**（例: `zc-lsection`）が必須。0 だと `MANDATORY_NOT_FOUND`。
- PUT は **POSTと同じ shape** + `action:"edit"` を送る。`GET ?parsed=false` の生レスポンスをそのままPUTに送ると `200` が返るが反映されない。
- Home モジュールの `id` は **Org ごとに異なる**。OAuth経由なら `GET /crm/v8/settings/modules` で `api_name='Home'` を引いて使う。

## 検証済みエンドポイント（2026-04-27）

両ドメインで同じスキーマ。`www.zohoapis.{TLD}` は OAuth、`crm.zoho.{TLD}` は OAuth でも内部API でも受理する。

| 操作 | メソッド | パス | 結果 |
|------|---------|------|------|
| 一覧 | GET | `/crm/v8/settings/canvas/views?feature=HomeView` | 200 / 204 |
| 詳細 | GET | `/crm/v8/settings/canvas/views/{id}?parsed=false` | 200 |
| 作成 | POST | `/crm/v8/settings/canvas/views` | 201 |
| 更新 | PUT | `/crm/v8/settings/canvas/views/{id}` | 200 |
| 削除 | DELETE | `/crm/v8/settings/canvas/views/{id}` | 200 |

### 必須ヘッダ

- `Cookie`（CRMセッション一式）
- `X-CRM-ORG`（組織ID）
- `X-ZCSRF-TOKEN: crmcsrfparam=<CSRF>`
- `X-Requested-With: XMLHttpRequest`
- `Content-Type: text/plain;charset=UTF-8`（POST/PUT 時）

`x-murphy-*` / `X-CRM-REF-ID` / `X-Static-Version` / `X-Client-SubVersion` / `x-my-normurl` は **すべて省略可**。

### スキーマの落とし穴

- `GET ?parsed=false` のレスポンスは GUI 内部状態を含む装飾済みフォーマットで、**そのまま PUT に投げても 200 が返るが反映されない**（name 等が変わらない）。
- PUT は **POST と同じ shape**（top-level `name` + `ui` + `children` + `feature` + `module` + `related_to` + `action: "edit"`）で送ること。
- POST 時、`children` は空配列ではなく **最低1個のコンポーネント**（例: `zc-lsection`）が必須。0 だと `MANDATORY_NOT_FOUND` で 400。

## 使い方

```bash
cp .env.example .env
# .env に Cookie / CSRF / Org ID を貼る（DevTools の任意の XHR から取得）

npm install
npm run list -- HomeView          # 一覧
npm run pull                      # 全 feature を canvases/ に書き出し
npm run push canvases/HomeView/_payload.json           # 作成
npm run push canvases/HomeView/_payload.json 123...    # 更新
npm run delete 12343000002851026                       # 削除
```

## 未検証（次のアクション）

ブラウザ DevTools での XHR キャプチャが必要：

- [ ] **Canvas のプロファイル割り当て**（誰に表示するか）
- [ ] **Export / Import**（JSON ファイル化）
- [ ] **Clone**（既存 Canvas の複製）

これらが揃えば、Canvas 設計を完全に Git で管理できる。
