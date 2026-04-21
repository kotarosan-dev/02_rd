# zoho-clientscript-test

Zoho CRM Client Script の **E2E テストハーネス**（Playwright + TypeScript）。

Client Script の Push は手動運用（CRMエディタにコピペ → 保存）で、
**保存後の動作検証だけを自動化**する位置づけ。

---

## セットアップ（初回のみ）

```powershell
cd zoho-clientscript-test
pnpm install
pnpm exec playwright install chromium
```

### ログイン状態の保存（`auth.json` 採取）

Zoho の MFA を毎回通すのを避けるため、ログイン状態を1回だけ手動保存する。

```powershell
pnpm run auth
```

ブラウザが開くので：

1. `crm.zoho.jp` で通常通りログイン（メール認証 / 2FA 含む）
2. CRM ホームが表示されたらブラウザを閉じる
3. リポジトリ直下に `auth.json` が生成される（`.gitignore` 済み）

> Cookie の有効期限が切れたら（通常 1〜2週間）再採取してください。

### 環境変数

`.env.example` をコピーして `.env` を作成。

```
ZOHO_CRM_BASE=https://crm.zoho.jp
ZOHO_ORG_ID=90000792316
TEST_CONTACT_ID=13059xxxxxxxxxxxx   # テスト用の使い捨て連絡先ID
```

---

## テスト実行

```powershell
pnpm test                # 通常実行（headless: false で目視確認）
pnpm run test:ui         # Playwright UI モード（推奨：開発時）
pnpm run test:headed     # ブラウザ表示
pnpm run test:debug      # ステップ実行
pnpm run report          # 直近のレポートを開く
```

---

## ディレクトリ

```
zoho-clientscript-test/
├── pages/                       Page Object（DOM セレクタを集約）
│   └── ContactEditPage.ts
├── tests/                       テスト本体
│   └── setAddress.spec.ts       郵便番号→住所自動入力の検証
├── playwright.config.ts
├── auth.json                   （gitignore）ログイン状態
└── .env                        （gitignore）テスト対象ID等
```

---

## Client Script 観測パターン早見

| Client Script のコード | テスト側で検証する手段 |
|---|---|
| `console.log(...)` | `page.on('console', msg => ...)` |
| `ZDK.Page.getField(X).setValue(Y)` | `expect(locator).toHaveValue(Y)` |
| `ZDK.HTTP.request(...)` / `fetch` | `page.on('request', req => req.url())` |
| `ZDK.Page.showMessage(...)` | Toast の DOM locator |
| `await ZDK.Apps.CRM.Functions.execute(...)` | `page.on('response')` で payload 確認 |

---

## 制約

- **Push は自動化不可**（Murphy トランスパイラがブラウザ側のため）。CRMエディタで保存してからテスト実行する運用。
- Zoho の DOM はバージョンアップでセレクタが変わることがある → セレクタは必ず `pages/*.ts` に集約。
- 実レコードを破壊しないよう、テスト用レコードを用意するか、編集後にキャンセルすること。

---

## トラブルシュート

- **「ログインを求められる」** → `auth.json` の Cookie 期限切れ。`pnpm run auth` で再採取。
- **フィールドが見つからない** → DOM が変わった可能性。`pages/ContactEditPage.ts` のセレクタを更新。
- **`X-CRM-ORG` で弾かれる** → 別組織ログイン状態の `auth.json` の可能性。再採取。
