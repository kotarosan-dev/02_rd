# Zoho CRM 内部 API エンドポイント台帳

DevTools / HAR / probe スクリプトから発見したエンドポイントを記録する。

## 列定義

- **Resource**: 論理対象（Function / ClientScript / WorkflowRule / ChangeSet 等）
- **Method**: HTTP メソッド
- **Path**: `crm.zoho.jp` 以下のパス
- **Query**: 必須クエリパラメータ
- **Content-Type**: 書き込み系の場合の Content-Type
- **Body**: 主要パラメータの schema（`-` なら body なし）
- **Response**: 返却 schema 概要
- **Captured**: 確認日付
- **Conf**: H/M/L
- **Notes**: ハマりポイント

## Functions (org / standalone / automation)

| Resource | Method | Path | Query | Content-Type | Body | Response | Captured | Conf | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Function (list) | GET | `/crm/v2/settings/functions` | `type=org&start=1&limit=50` | - | - | `{ functions: [{ id, api_name, display_name, language, category, workflow:{name,namespace,params,returnType}, tasks, rest_api[], modified_by, ... }] }` | 2026-04-17 | **High** | list 時の `workflow` は **オブジェクト**（メタ情報） |
| Function (get) | GET | `/crm/v2/settings/functions/<id>` | **`source=crm`** （必須） | - | - | `{ functions: [{ id, name, nameSpace, api_name, display_name, language, category, return_type, script, workflow, tasks, rest_api[], description, ... }] }` | 2026-04-17 | **High** | `source` 無しだと 400 `PATTERN_NOT_MATCHED { api_name: "source" }`。detail 時の `script` は完全形 `void automation.<name>(){...}`、`workflow` は body のみ |
| Function (update) | **PUT** | `/crm/v2/settings/functions/<id>` | **`language=deluge`** （必須） | `application/json; charset=UTF-8` または `text/plain;charset=UTF-8` | フラット形式 (推奨): `{"functions":[{"name","display_name","description","return_type":"void","params":[],"workflow":"<body>","commit_message":"..."}]}` ／ details ラップ形式も受理: `{"functions":[{"details":{"name","description","display_name","script":"void <ns>.<name>(){...}"}}]}` | `{"functions":[{"details":{...},"message":"function updated successfully","status":"success"}]}` | 2026-04-17 | **High** | サーバは 2 形式を受理する。フラット形式は UI が使う正規形。`workflow` は body のみ、`script` はラッパー込み |
| Function (create) | **POST** | `/crm/v2/settings/functions` | **`language=deluge`** （必須） | `application/json; charset=UTF-8` | フラット: `{"functions":[{"name","display_name","description":"","return_type":"void","params":[],"workflow":"<body>","commit_message":"...","category":"automation"}]}` | `{"functions":[{"code":"SUCCESS","details":{"id":"<new-id>","api_name","name","display_name","script":"{...}","return_type":"void",...},"message":"function created successfully","status":"success"}]}` | 2026-04-17 | **High** | **重要**: `api_name` は `name` から生成され、**先頭の `_` は自動削除される**（例 `_probe_x` → `probe_x`）。`workflow` を含めて POST しても response の `script` は空ラッパー `{\n\n}` となるケースあり（UI は POST→PUT の 2 段階で完成させている可能性）。`category` 省略時の挙動は未検証 |
| Function (delete) | **DELETE** | `/crm/v2/settings/functions/<id>` | **不要** | - | - | `{"functions":[{"code":"SUCCESS","details":{"id":"<id>"},"message":"function deleted successfully","status":"success"}]}` | 2026-04-17 | **High** | クエリパラメータ不要。削除後の GET は **204 No Content** が返る |
| Function (validate) | POST | TBD | TBD | TBD | TBD | TBD | - | Low | Save & Execute Script ボタン押下時。要 HAR キャプチャ |

### Function create 検証済みの最小例

```http
POST /crm/v2/settings/functions?language=deluge
Cookie: <ZOHO_COOKIE>
X-ZCSRF-TOKEN: crmcsrfparam=<token>
X-CRM-ORG: 90000792316
X-Requested-With: XMLHttpRequest
Referer: https://crm.zoho.jp/
Content-Type: application/json; charset=UTF-8

{"functions":[{"display_name":"my_func","description":"","name":"my_func","return_type":"void","params":[],"workflow":"\ninfo \"hello\";\n","commit_message":"create my_func","category":"automation"}]}
```

→ `200 OK` + `{"functions":[{"code":"SUCCESS","details":{"id":"<new-id>",...},"message":"function created successfully","status":"success"}]}`

### Function delete 検証済みの最小例

```http
DELETE /crm/v2/settings/functions/2445000000056009
Cookie: <ZOHO_COOKIE>
X-ZCSRF-TOKEN: crmcsrfparam=<token>
X-CRM-ORG: 90000792316
X-Requested-With: XMLHttpRequest
Referer: https://crm.zoho.jp/
```

→ `200 OK` + `{"functions":[{"code":"SUCCESS","details":{"id":"2445000000056009"},"message":"function deleted successfully","status":"success"}]}`

### Function update 検証済みの最小例

```http
PUT /crm/v2/settings/functions/2445000000056007?language=deluge
Cookie: <ZOHO_COOKIE>
X-ZCSRF-TOKEN: crmcsrfparam=<token>
X-CRM-ORG: 90000792316
X-Requested-With: XMLHttpRequest
Referer: https://crm.zoho.jp/
Content-Type: text/plain;charset=UTF-8

{"functions":[{"details":{"name":"thisistest","description":null,"display_name":"thisi is test","script":"void automation.thisistest()\n{\nthisistest = zoho.loginuserid;\n}"}}]}
```

→ `200 OK` + `{"functions":[{"details":{"display_name":"thisi is test"},"message":"function updated successfully","status":"success"}]}`

## ClientScript

| Resource | Method | Path | Query | Body | Response | Captured | Conf | Notes |
|---|---|---|---|---|---|---|---|---|
| ClientScript (list/get/update) | TBD | TBD | TBD | TBD | TBD | - | Low | Phase 2 で要キャプチャ |

## Workflow

| Resource | Method | Path | Query | Body | Response | Captured | Conf | Notes |
|---|---|---|---|---|---|---|---|---|
| Workflow Rule (function attach) | TBD | TBD | TBD | TBD | TBD | - | Low | Phase 2 で要キャプチャ |

---

## 必須ヘッダ（全リクエスト共通）

| ヘッダ | 値 | 出所 |
|---|---|---|
| `Cookie` | DevTools の `cookie` ヘッダ全文。最低限 `_zcsr_tmp`, `crmcsr`, `JSESSIONID`, `_iamadt`, `_iambdt`, `zalb_*` が必要 | DevTools |
| `X-ZCSRF-TOKEN` | `crmcsrfparam=<token>`。`<token>` は Cookie の `_zcsr_tmp` / `crmcsr` と同一 | DevTools |
| `X-CRM-ORG` | 数値の Org ID | DevTools |
| `X-Requested-With` | `XMLHttpRequest` | 固定 |
| `Referer` | `<ZOHO_BASE_URL>/` | 固定 |

## 既知ノイズヘッダ（送らなくても OK）

`x-murphy-*` (session-id / span-id / tab-id / trace-id), `X-Static-Version`,
`X-Client-SubVersion`, `x-my-normurl`, `isFrom`, `sec-ch-ua*`, `Origin`,
`X-CRM-REF-ID`（ただし将来監査用に必要になる可能性あり、要観察）

## 既知の注意点

- `?source=crm` (GET) と `?language=deluge` (PUT) で**クエリ名が異なる**
- 書き込み body は **JSON 文字列を text/plain で送る**特殊形式（axios の自動 JSON 化を抑止する必要あり）
- `script` には `void <namespace>.<name>(){...}` のラッパーが必要。`workflow` には body のみ。**両方を矛盾なく送る必要があるかは未検証**（今回は `script` のみで成功）
- 失敗時の代表 response 形:
  - `{"code":"PATTERN_NOT_MATCHED","details":{"api_name":"source"},...}` → 必須クエリ欠落
  - `{"code":"INVALID_REQUEST_METHOD",...}` → そのパスでそのメソッドは未実装（POST→PUT へ）
  - `{"code":"INTERNAL_ERROR",...}` → body 形式が違う（多くは Content-Type または JSON wrapper の不一致）
