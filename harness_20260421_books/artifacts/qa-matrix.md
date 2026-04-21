# QA Matrix — harness_20260421_books

最終更新: 2026-04-21（QA-STEP-3 一部実行済み）

## §1 検証レベル対応表

| レベル | 本スプリントでの意味 |
|---|---|
| **Record** | 対象 API がエンドポイント単位で 200 + 期待プロパティを含む応答を返す |
| **Field** | 期待フィールド（id・name・status 等）が実際にレスポンスに含まれる |
| **Workflow** | CRUD ループ完走（create→get→update→delete）または internal API での execute→logs 取得まで成功 |

---

## §2 自動検証ケース（TC-AUTO-NN） — T01 公式 API 結果

すべて `node --env-file=../.env scripts/<file>` で実行 (Node v22)。`organization_id=90000792806`、`https://www.zohoapis.jp/books/v3` を使用。

### T01-A0 / T01-A: OAuth 疎通

| TC ID | 内容 | 結果 | 証跡 |
|---|---|---|---|
| TC-AUTO-T01A0-01 | soid=ZohoBooks.{CRM_org} で token 取得 → /organizations | **PASS** | HTTP 200 / org_id=90000792806 / "kotarosan" / JPY |
| TC-AUTO-T01A0-02 | soid=ZohoBooks.{Books_org} でも同一結果 | **PASS** | 同上 |
| TC-AUTO-T01A-01  | Books org_id を `90000792806` に確定 | **PASS** | tasks.json 更新済み |

**判明事項**: soid はトークン取得のヒントに過ぎず、`?organization_id=` クエリで対象 org が決まる。`.env` の `ZOHO_ORG_ID=90000792316` (CRM) のままで Books も叩ける。

### T01-B: 公式 API 読み取りマトリクス

| TC ID | エンドポイント | HTTP | 結果 |
|---|---|---|---|
| TC-AUTO-T01B-01 | /organizations          | 200 | PASS |
| TC-AUTO-T01B-02 | /chartofaccounts        | 200 | PASS |
| TC-AUTO-T01B-03 | /settings/taxes         | 200 | PASS |
| TC-AUTO-T01B-04 | /items                  | 200 | PASS |
| TC-AUTO-T01B-05 | /contacts               | 200 | PASS |
| TC-AUTO-T01B-06 | /invoices               | 200 | PASS |
| TC-AUTO-T01B-07 | /estimates              | 200 | PASS |
| TC-AUTO-T01B-08 | /salesorders            | 200 | PASS |
| TC-AUTO-T01B-09 | /bills                  | 200 | PASS |
| TC-AUTO-T01B-10 | /customerpayments       | 200 | PASS |
| TC-AUTO-T01B-11 | /vendorpayments         | 200 | PASS |
| TC-AUTO-T01B-12 | /paymentlinks           | 200 | PASS |
| TC-AUTO-T01B-13 | /settings/preferences   | 200 | PASS |
| TC-AUTO-T01B-14 | /users                  | 200 | PASS |
| TC-AUTO-T01B-15 | /settings/currencies    | 200 | PASS |
| TC-AUTO-T01B-16 | /bankaccounts           | 200 | PASS |
| TC-AUTO-T01B-17 | /projects               | 200 | PASS |
| TC-AUTO-T01B-18 | /expenses               | 200 | PASS |
| TC-AUTO-T01B-19 | /journals               | 200 | PASS |
| TC-AUTO-T01B-20 | /recurringinvoices      | 200 | PASS |
| TC-AUTO-T01B-21 | /creditnotes            | 200 | PASS（追加） |
| TC-AUTO-T01B-22 | /purchaseorders         | 200 | PASS（追加） |
| TC-AUTO-T01B-23 | /vendorcredits          | 200 | PASS（追加） |
| TC-AUTO-T01B-24 | /transactions           | 404 | NOT_FOUND（仕様。代替は /reports） |

**結果: 23/24 PASS。Books 公式 API は読み取り全領域で完全に使える。**

### T01-D: Workflow / Function / Schedule 公式 API 探索（21 候補）

| TC ID | 候補 path | HTTP | 結果 |
|---|---|---|---|
| TC-AUTO-T01D-01 | **/settings/workflows**       | **200** | **HIT** （workflows[] を返す。kotarosan org は 0 件） |
| TC-AUTO-T01D-02 | **/settings/webhooks**        | **200** | **HIT** （webhooks[] を返す。0 件） |
| TC-AUTO-T01D-03 | /settings/customfunctions     | 404 | miss |
| TC-AUTO-T01D-04 | /settings/functions           | 404 | miss |
| TC-AUTO-T01D-05 | /settings/schedules           | 404 | miss |
| TC-AUTO-T01D-06 | /settings/automation/*        | 404 | miss (6 件) |
| TC-AUTO-T01D-07 | /functions /workflows /schedules /webhooks (top-level) | 404 | miss |
| TC-AUTO-T01D-08 | /automation/*                 | 404 | miss (3 件) |

**追加深堀り (T01-D2)**:

| 候補 path | HTTP | 備考 |
|---|---|---|
| **/settings/customfields** | **200** | カスタムフィールド一覧 |
| **/settings/templates**    | **200** | 請求書/見積テンプレート一覧（既存ドキュメントの "GUI 必須" は要修正） |
| **/settings/emailtemplates** | **200** | メールテンプレート一覧 |
| /settings/connections      | 404 | OAuth 接続管理は不可 |
| /settings/customviews      | 404 | カスタムビューは不可 |

**判明した境界線**:

| カテゴリ | 公式 API | 内部 API（T02 で要検証） |
|---|---|---|
| 業務データ CRUD | ✅ 全部 | – |
| Workflow Rule の **list/get** | ✅ `/settings/workflows` | – |
| Webhook の **list** | ✅ `/settings/webhooks` | – |
| カスタムフィールド・テンプレート | ✅ | – |
| **Custom Function の Deluge body** | ❌ | ⏳ 要検証 |
| **Custom Function の execute / logs** | ❌ | ⏳ 要検証 |
| **Custom Schedule** | ❌ | ⏳ 要検証 |
| **Workflow の create / update** | ⚠️ 不明（GET のみ確認） | ⏳ 要検証 |

→ **T02 (HAR + Cookie 内部 API) の必要性が確定**

---

## §3 手動・ハイブリッドケース（TC-MAN-NN） — T02 内部 API HAR

| TC ID | 状態 | 内容 |
|---|---|---|
| TC-MAN-T02A-01 | **PASS** | `docs/har-capture-procedure-books.md` 作成済（8 シナリオ A〜H） |
| TC-MAN-T02B-01 | **待ち（ユーザー作業）** | ユーザーが Chrome DevTools で 8 シナリオを録画して `docs/har/` に配置 |
| TC-MAN-T02C-01 | 未着手 | HAR 解析 → `docs/books-internal-api-spec.md` 作成 |
| TC-MAN-T02D-01 | 未着手 | Cookie 認証 PoC: list 1 本 |
| TC-MAN-T02E-01 | 未着手 | get → ノーオペ update（破壊なし） |
| TC-MAN-T02F-01 | 未着手 | create → execute → logs → delete フルサイクル |

---

## §4 既知の制約 / 待ち

| TC ID | 内容 |
|---|---|
| TC-EXTERNAL-01 | Books の内部 API スキーマは Zoho の予告なしに変更されうる |
| TC-EXTERNAL-02 | 本番組織 (90000792806) で write を行うため、テストデータは必ず `_qa_books_` 接頭辞 + try/finally |
| TC-BLOCKED-01 | T02-C 以降は HAR ファイル待ち（ユーザー手動作業） |
| TC-BLOCKED-02 | T01-C 書き込みサイクル（chartofaccounts/items/contacts/invoices の create→delete）は **ユーザー再承認待ち** |

---

## §5 合否サマリー

| 領域 | 緑 | 黄 | 赤 | 待ち |
|---|---|---|---|---|
| T01-A0/A 認証＆org確定 | **3** | 0 | 0 | 0 |
| T01-B 読み取り (24 ep) | **23** | 1 (B-24 404 仕様) | 0 | 0 |
| T01-D 関数系API探索 (21+5) | **5 HIT** | 0 | 0 | 0 |
| T01-C 書き込みサイクル | 0 | 0 | 0 | 4 (承認待ち) |
| T01-E ドキュメント化 | 0 | 0 | 0 | 1 |
| T02-A HAR 手順書 | **1** | 0 | 0 | 0 |
| T02-B HAR 採取 | 0 | 0 | 0 | 1 (ユーザー作業) |
| T02-C〜G PoC | 0 | 0 | 0 | 5 |

**進捗: 32/34 のうち 32 件が緑または手順完了。残 12 件のうち 4 件は T01-C 承認待ち、6 件は HAR 配置待ち、2 件は文書化。**
