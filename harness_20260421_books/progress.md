# Progress Log — harness_20260421_books

## 2026-04-21 — Session 開始 (QA-STEP-0/1)

- harness ディレクトリ作成
- tasks.json 生成（T01: 6 タスク + T02: 7 タスク）
- artifacts/qa-matrix.md 列挙（34 TC）

## 2026-04-21 — QA-STEP-2/3 (T01-A0 / T01-A)

- `scripts/_lib.mjs`, `scripts/t01a0_books_probe.mjs` 作成
- 実行: `node --env-file=../.env scripts/t01a0_books_probe.mjs`
- **判明事項**:
  - Books の正しい org_id は `90000792806`（CRM の 90000792316 とは別）
  - soid に CRM org_id を入れても同じ Books org のトークンが取れる（soid はヒントに過ぎず）
  - `.env` を変更する必要なし。Books API 呼び出しでは `?organization_id=90000792806` をクエリで指定する
- `[PASS]` 出力確認

## 2026-04-21 — QA-STEP-3 (T01-B 読み取り 24 EP)

- `scripts/t01b_read_matrix.mjs` 作成
- 実行: `node --env-file=../.env scripts/t01b_read_matrix.mjs`
- 結果: **PASS=23 / NOT_FOUND=1 / TOTAL=24**
  - NOT_FOUND は `/transactions` のみ（404 code:5 "Invalid URL Passed"）
  - 残り 23 エンドポイントすべて HTTP 200 / code:0 / success
- 標準業務オブジェクト（chartofaccounts, taxes, items, contacts, invoices, estimates, salesorders, bills, customerpayments, vendorpayments, paymentlinks, recurringinvoices, creditnotes, purchaseorders, vendorcredits, expenses, journals, projects, bankaccounts, users, currencies, preferences）は完全に公式 API で読み取り可能

## 2026-04-21 — QA-STEP-3 (T01-D Workflow/Function/Schedule API 探索)

- `scripts/t01d_function_api_probe.mjs` 作成・実行（21 候補）
- 結果: **HIT=2 / 21**
  - ✅ `/settings/workflows` (workflows[] を返す)
  - ✅ `/settings/webhooks`  (webhooks[] を返す)
- `scripts/t01d2_workflows_deep.mjs` で深堀り
  - kotarosan org には workflow / webhook が 0 件
  - 追加 HIT: `/settings/customfields`, `/settings/templates`, `/settings/emailtemplates`
- **境界線確定**:
  - 公式 API: workflow rule の list/get、webhook list、customfield、テンプレート
  - 公式 API NG: **Custom Function の Deluge body / execute / logs**、**Schedule**、Connection、CustomView
- → **T02 (Cookie 内部 API) の必要性が確定**

## 2026-04-21 — QA-STEP-3 (T02-A HAR 手順書)

- `docs/har-capture-procedure-books.md` 作成（8 シナリオ A〜H）
  - A: Workflow Rule list / get
  - B: Custom Function の編集・保存
  - C: Custom Function 新規作成
  - D: Custom Function テスト実行
  - E: 実行履歴 (logs)
  - F: Custom Function 削除
  - G: Schedule
  - H: Custom Button (任意)
- `.gitignore` に `docs/har/*` 追加（Cookie/CSRF 漏洩防止）
- `docs/har/.gitkeep` 作成

## 2026-04-21 — T02-B 1 回目 (HAR A/B/C 配置 → 解析失敗)

- ユーザーが Scenario A/B/C を `zoho-deluge-sync/docs/har/` に配置（採取場所が docs/har_/ ではなく既存の zoho-deluge-sync 配下になった点は許容）
- `scripts/t02c_har_extract.mjs`, `t02c2_har_writes.mjs`, `t02c3_har_domains.mjs`, `t02c4_har_all.mjs` を作成し抽出
- **結果**: 全 21 件のエントリが GET のみ。POST/PUT/DELETE が **0 件**
- 原因: **DevTools の Preserve log が OFF** だったため、Save 完了後のページ遷移で XHR ログが消失
- ただし以下の貴重な情報は確定:
  - 内部 API ベース: `https://books.zoho.jp/api/v3/...`（公式 OAuth とは別ホスト）
  - CSRF ヘッダ名: `X-ZCSRF-TOKEN`（CRM と同じ）
  - Deluge UI 設定: `https://books.zoho.jp/deluge/api/ui/settings?service=ZohoBooks&scopeID=<org_id>`
  - 周辺リソース: `/api/v3/settings/{workflows, alerts, emailtemplates, automation/modulefilters}`
- **対応**: `docs/har-capture-procedure-books.md` に「DevTools の必須設定（Preserve log / Disable cache / All フィルタ）」セクションを追加
- ユーザーに再採取依頼

## 待ちフェーズ

- **T02-B (再採取)**: Preserve log ON + All フィルタで 8 シナリオを再録画
- **T01-C**: 本番組織で `_qa_books_` テストデータ create→delete を実行することの再承認
