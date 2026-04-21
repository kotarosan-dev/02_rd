# Next Actions（HAR C/D 解析完了時点）

## ✅ 完了

- HAR C / D 採取（Preserve log ON で正常記録 — POST 1件 / PUT 9件確認）
- 内部 API 仕様書化 → `docs/books-internal-api-spec.md`
- 確定エンドポイント:
  - `POST /api/v3/integrations/customfunctions`（create）
  - `PUT  /api/v3/integrations/customfunctions/{id}`（save / execute 統合 — `is_execute:true` で実行）
  - `GET  /api/v3/integrations/customfunctions`（list）
  - `GET  /api/v3/integrations/customfunctions/editpage?customfunction_id={id}&entity={e}`（get）
  - `GET  /api/v3/entitylist?entity={e}` （sample_param.entity_id 候補取得）
- PoC スクリプト用意:
  - `scripts/_books_lib.mjs`（Cookie+CSRF 認証 fetch ラッパー）
  - `scripts/t02d_cf_list.mjs` — read-only 一覧取得
  - `scripts/t02e_cf_smoke.mjs` — create→update→execute→logs候補→delete のフルサイクル

## ⏳ あなたに依頼（PoC 実行のための準備）

### 必須: Cookie の手動採取

HAR は Chrome のプライバシー保護で Cookie がマスクされており、機械的に取れません。
以下のとおり .env.books を作成してください:

1. `harness_20260421_books/.env.books.example` を `.env.books` にコピー
2. ブラウザで https://books.zoho.jp/app/90000792806/integrations/customfunctions を開いてログイン状態にする
3. F12 → Network → そのページで /api/v3/integrations/customfunctions などのリクエストをクリック
4. Request Headers の `Cookie:` 行の値を丸ごとコピーし、`.env.books` の `ZOHO_BOOKS_COOKIE=` に貼る
5. （CSRF は HAR の値で初期値入りなので、Cookie 採取直後ならそのままで OK。古くなったら同じ画面の `X-ZCSRF-TOKEN` も更新）

## 🧪 PoC 実行

### Step 1: read-only 検証（無害）
```powershell
cd harness_20260421_books
pnpm t02d
```
→ list が HTTP 200 で返れば認証 OK。

### Step 2: フルサイクル検証（要承認 — write & delete）
- 影響範囲: 実環境 Books の Custom Function を「`_qa_books_smoke_xxxxx`」名で1個作成 → execute → 削除
- 削除は `try/finally` で必ず実行
- execute 内容は `info` を1行出すだけの無害コード（invoice の取得のみ）

実行可否ご確認ください。承認なら:
```powershell
pnpm t02e
```
を打ちます。アウトプットは `artifacts/cf-smoke.json` に全レスポンスをトレース保存し、以下を確定します:
  1. PUT (is_execute:true) のレスポンス JSON 構造（output / logs / status / error の形）
  2. DELETE エンドポイントのパス（`DELETE /customfunctions/{id}` で通るか）
  3. logs 履歴エンドポイントのパス（4 候補を順に試行）

## 並行: Scenario E (logs UI) の HAR 採取（任意）

logs エンドポイントが推測で当たらなかった場合のフォールバックとして、
`docs/har-capture-procedure-books.md` の Scenario E を再採取いただきたいです（10 分程度）。
