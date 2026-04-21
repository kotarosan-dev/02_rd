# Books 内部 API 仕様書（HAR リバースエンジニアリング結果）

> ## ⚠️ 利用範囲の制約（厳守）
>
> 本仕様書および `harness_20260421_books/` 配下の実装は **自社（kotarosan, Org `90000792806`）専用** の運用ツールです。
>
> - ❌ **クライアント（顧客）Org への適用は禁止**
> - ❌ **汎用 skill 化・他チームへの配布は禁止**（他人が顧客環境に持ち込むリスクを排除するため）
> - ❌ 他人の Cookie / CSRF を使ったアクセスは禁止（不正アクセス禁止法に抵触）
> - ✅ 自社 Org の自分の認証情報で、社内開発・検証用途のみ
>
> 理由:
> 1. 内部 API は Zoho 公式サポート対象外で、仕様変更で予告なく壊れる
> 2. クライアントへ提供すると、Zoho 仕様変更時に責任問題化する
> 3. UA 偽装 + Cookie 利用は規約上のグレーゾーン（自社利用は OK だが商用配布は NG）
>
> CRM 側 (`zoho-deluge-sync`) も同じスタンスで運用中。

調査日: 2026-04-21
調査対象: `https://books.zoho.jp` (kotarosan org `90000792806`)
HAR 出典: `zoho-deluge-sync/docs/har/books_c_function_create.har`, `books_d_function_execute.har`

---

## 1. 認証モデル（CRM Deluge とほぼ同じ）

| 項目 | 値 |
|---|---|
| ベース URL | `https://books.zoho.jp` |
| 認証方式 | **Cookie + CSRF**（OAuth 不可。Self Client では届かない） |
| CSRF ヘッダ名 | **`X-ZCSRF-TOKEN: zbcsparam=<token>`**（CRM の `crmcsrfparam=` に対応） |
| 任意ヘッダ | `X-ROLE-ID: <user_role_id>`（HAR より `3092000000000837`） |
| Sec ヘッダ | `Sec-Fetch-Site: same-origin`（必須かは未確認） |
| **User-Agent** | **Chrome の UA を偽装すること（必須）**。`Mozilla/5.0 ...Chrome/147...`。Node デフォルト UA だと Zoho IAM が step-up auth を強制し全 API が `code 1071: ReAuthentication needed` で失敗する |
| 必須ヘッダ | `X-Requested-With: XMLHttpRequest` |
| 必須ヘッダ | `Referer: https://books.zoho.jp/app/<org_id>` |
| 必須ヘッダ | `Origin: https://books.zoho.jp` |
| 任意ヘッダ | `X-ZB-Asset-Version: Apr_18_2026_23910`（バージョンガード。古くても通る可能性大） |
| 任意ヘッダ | `X-ZB-SOURCE: <8 chars>`（用途不明・とりあえずコピー） |
| 任意ヘッダ | `X-ZOHO-Include-Formatted: true`（金額等のフォーマット済み値を返す） |
| 必須クエリ | `?organization_id=<org_id>` |

CRM の `X-ZCSRF-TOKEN: crmcsrfparam=<token>` と同じく、Books でも **`X-ZCSRF-TOKEN: <値>`** を渡す。

---

## 2. Custom Function CRUD エンドポイント（Workflow 用）

ベースパス: `/api/v3/integrations/customfunctions`

### 2.1 list（一覧）

```
GET /api/v3/integrations/customfunctions?page=1&per_page=50&filter_by=Entity.All&sort_column=created_time&sort_order=A&usestate=false&organization_id=<org>
```

クエリ:
- `page` / `per_page`: ページネーション
- `filter_by`: `Entity.All` または `Entity.<entity>` で entity 絞り込み
- `sort_column`: `created_time` / `last_modified_time` / `function_name`
- `sort_order`: `A`（昇順） or `D`
- `usestate`: false 固定でよい

### 2.2 get / edit page（詳細）

新規ページ（id 未指定）:
```
GET /api/v3/integrations/customfunctions/editpage?entity=invoice&organization_id=<org>
```

既存関数:
```
GET /api/v3/integrations/customfunctions/editpage?customfunction_id=<id>&entity=<entity>&organization_id=<org>
```

→ ここで `script`（Deluge 本体）, `function_name`, `entity` 等が返る。

### 2.3 create

```
POST /api/v3/integrations/customfunctions
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

JSONString=<URLエンコードされたJSON>&organization_id=<org>
```

JSONString の中身（実機で記録された create body）:
```json
{
  "function_name": "_qa_books_test2",
  "description": "",
  "entity": "invoice",
  "language": "deluge",
  "script": "/* Deluge body そのまま（wrapped 不要、CRM とは異なる） */",
  "include_orgvariables_params": false,
  "return_type": "void"
}
```

レスポンス: HTTP **201 Created**

#### entity の取り得る値（推定）
- `invoice`, `estimate`, `salesorder`, `bill`, `purchaseorder`, `customer_payment`, `vendor_payment`, `expense`, `creditnote`, `recurring_invoice`, `contact`, `item` ほか

#### create 時の関数名正規化
- アンダースコア始まり (`_qa_books_test2`) で create すると、後続の PUT では `qa_books_test2` に正規化されている。CRM と同じ振る舞い（**先頭アンダースコア剥がし**）。
- create レスポンスの `function_name` を信頼すること。

### 2.4 update

```
PUT /api/v3/integrations/customfunctions/<id>
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

JSONString=<URLエンコードされたJSON>&organization_id=<org>
```

JSONString の中身（save のみ / is_execute:false）:
```json
{
  "function_name": "qa_books_test2",
  "description": "",
  "entity": "invoice",
  "language": "deluge",
  "script": "...",
  "is_execute": false,
  "sample_param": { "entity_id": "<対象エンティティのレコードID>" },
  "include_orgvariables_params": false,
  "return_type": "void"
}
```

レスポンス: HTTP 200。

### 2.5 execute（save + 実行 が同一 PUT で完結 — CRM と異なる）

```
PUT /api/v3/integrations/customfunctions/<id>
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
```

`is_execute: true` を立てる:
```json
{
  ...,
  "script": "...",
  "is_execute": true,
  "sample_param": { "entity_id": "3092000000250001" }
}
```

- **`sample_param.entity_id` は実在する invoice 等のレコード ID**。`/api/v3/entitylist?entity=invoice&...` で取得できる
- レスポンスは 9〜10 KB の JSON。**T02-E PoC で構造確定**:

```jsonc
{
  "code": 0,
  "message": "カスタム関数を更新しました。",
  "customfunction": {
    "customfunction_id": "3092000000389019",
    "drefunction_id": "...",
    "function_name": "...",
    "placeholder": "fn_...",
    "entity": "invoice",
    "entity_formatted": "請求書",
    "language": "deluge",
    "script": "...",
    "return_type": "void",
    "function_param": [
      { "param_name": "invoice", "param_value": "${JSONString}", "sample_value": "{}", "param_type": "map", "param_order": 1, "is_additional_param": false },
      { "param_name": "organization", ... }
    ],
    "include_orgvariables_params": false,
    "description": ""
  },
  "execution_response": {
    "args": { "organization": "{...}", "invoice": "{...}" },   // 実行時に渡された引数のスナップショット
    "log_message": ["PoC OK invoiceID=3092000000250001"]        // Deluge の info 出力配列
    // エラー時は別キーで err / stack 等が入る想定（要追加検証）
  }
}
```

**重要**: Books は CRM の `/actions/test` 相当を **本体 PUT に統合** している。save と test が常にセットで、別エンドポイント不要。これは TDD ループ実装上有利。

### 2.6 entity_id 候補一覧（execute 用）

```
GET /api/v3/entitylist?entity=invoice&page=1&per_page=10&organization_id=<org>
```

execute する前に sample 用の entity_id を取得するために UI が叩く補助 API。

### 2.7 delete（PoC で確定）

```
DELETE /api/v3/integrations/customfunctions/<id>?organization_id=<org>
```

レスポンス:
```json
{ "code": 0, "message": "カスタム関数を削除しました。" }
```

### 2.8 logs / 実行履歴（PoC で 4 候補すべて 404）

以下はすべて `code 5: Invalid URL Passed` で外れた:
- `GET /api/v3/integrations/customfunctions/<id>/logs`
- `GET /api/v3/integrations/customfunctions/<id>/executionhistory`
- `GET /api/v3/integrations/customfunctions/<id>/history`
- `GET /api/v3/integrations/customfunctions/logs?customfunction_id=<id>`

→ **過去の workflow 発火履歴を見たい場合は Scenario E (logs UI) の HAR 採取が必要**。

ただし **TDD 用途では不要** — テスト実行時のログは PUT (is_execute:true) のレスポンス `execution_response.log_message` に直接入るため、`/logs` 取得は省略可能。

---

## 3. 補助エンドポイント

| エンドポイント | 用途 |
|---|---|
| `GET /deluge/api/ui/settings/fetchTopBarEnhanceEnabledServices` | Deluge エディタ UI 初期化 |
| `GET /deluge/api/ui/settings?service=ZohoBooks&scopeID=<org>` | Deluge エディタ UI 設定 |
| `GET /deluge/api/ui/webinar-card?serviceName=zohobooks` | UI バナー（無視可） |
| `GET /api/v3/settings/automation/modulefilters?organization_id=<org>` | エンティティ一覧 |
| `GET /api/v3/settings/alerts?organization_id=<org>` | アラート設定（自動化メニューの一部） |
| `GET /api/v3/settings/emailtemplates?organization_id=<org>` | メールテンプレート（公式 OAuth でも可） |
| `GET /api/v3/settings/workflows?...&organization_id=<org>` | Workflow Rule 一覧（公式 OAuth でも可） |

---

## 4. CRM Deluge との対比

| 項目 | CRM | Books |
|---|---|---|
| ベース | `https://crm.zoho.jp/crm/v2/settings/functions` | `https://books.zoho.jp/api/v3/integrations/customfunctions` |
| CSRF ヘッダ | `X-ZCSRF-TOKEN: crmcsrfparam=<>` | `X-ZCSRF-TOKEN: <>` |
| Org ヘッダ | `X-CRM-ORG: <crm_org_id>` | （ヘッダ不要、クエリ `?organization_id=` |
| Content-Type (write) | `text/plain;charset=UTF-8` | **`application/x-www-form-urlencoded`** |
| Body 形式 | `{"functions":[{...}]}` JSON | **`JSONString=<エンコードされたJSON>&organization_id=`** form |
| script フィールド | `void automation.NAME(...) { body }`（wrapped） | **plain Deluge body** |
| update fields | `name, display_name, return_type, params, workflow, commit_message` | `function_name, entity, language, script, sample_param, is_execute, return_type` |
| execute エンドポイント | 専用 `POST .../actions/test` | **PUT 本体に `is_execute:true` を載せる** |
| logs エンドポイント | `GET .../<id>/logs?period=...` | 未確定（推定: `.../logs`） |
| entity 概念 | なし（automation カテゴリのみ） | **`invoice`/`estimate` 等の対象モジュール必須** |
| sample_param | なし（args:{key:value}） | **`{entity_id: "<レコードID>"}` 必須** |

→ **CRM 用の `zoho-deluge-sync` を Books 用に横展開する場合、抽象化レイヤを書き換える必要あり**（form エンコード, JSONString ラッピング, entity 必須, is_execute フラグ）。

---

## 5. 確定済み事実 vs 要追加調査

### ✅ 確定（PoC 不要）
- 認証ヘッダ・必須クエリ
- list / editpage(get) / create / update のリクエスト構造
- execute は PUT + is_execute:true で同 endpoint

### ⏳ PoC で要確認
- PUT (is_execute:true) の **レスポンス構造**（output / logs / status / error の形）
- DELETE エンドポイントのパス
- logs / 履歴エンドポイントのパス
- 構文エラー時の response status と body 構造

### ❌ HAR 未採取（必要なら再採取）
- Scenario E (logs 履歴)
- Scenario F (delete)
- Scenario G (Schedule)
- Scenario H (Custom Button)
