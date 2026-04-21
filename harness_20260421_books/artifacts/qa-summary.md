# Books CRUD 検証 最終サマリ（2026-04-21）

## ✅ 確定事項

### T01: Books 公式 OAuth API
- 23/24 read エンドポイント PASS（`/transactions` のみ仕様外で 404）
- `/settings/workflows`, `/settings/webhooks`, `/settings/customfields`, `/settings/templates`, `/settings/emailtemplates` が公式 API で読み取り可
- **Custom Function の Deluge body は公式 API では取得不可**（list のメタしか返らない）

### T02: Books 内部 API（Cookie+CSRF+Chrome UA）
- Custom Function CRUD + save+execute すべて実機 200 動作確認
- Deluge `info` 出力が PUT レスポンス `execution_response.log_message[]` に直接返る
- 過去実行履歴の logs エンドポイントは未確定（4 候補 404）
- **認証 3 点セット必須**:
  1. `Cookie` 全文（`zbcscook=...; JSESSIONID=...; ...`）
  2. `X-ZCSRF-TOKEN: zbcsparam=<zbcscook と同じ値>`
  3. **`User-Agent: Mozilla/5.0 ...Chrome/...`（必須。Node デフォルトだと 1071 ReAuth Required）**

## 📋 PoC 実行結果（artifacts/cf-smoke.json）

| Step | Endpoint | Status | 備考 |
|---|---|---|---|
| CREATE | POST /api/v3/integrations/customfunctions | 201 | `customfunction.customfunction_id` で id 取得 |
| GET | GET .../editpage?customfunction_id=&entity= | 200 | `entity_params` に sample data |
| UPDATE | PUT .../<id> + is_execute:false | 200 | save only |
| ENTITYLIST | GET /api/v3/entitylist?entity=invoice | 200 | `data[].invoice_id` 形式 |
| **EXECUTE** | PUT .../<id> + is_execute:true + sample_param | 200 | `execution_response.log_message` 取得 |
| LOGS | GET .../{id}/logs ほか 4 候補 | 404 | 全部 `code 5 Invalid URL Passed` |
| DELETE | DELETE /api/v3/integrations/customfunctions/<id> | 200 | クリーンアップ成功 |

## 🚫 利用範囲ガード

- 自社 Org (kotarosan, 90000792806) 専用
- クライアント Org への適用 / skill 化 / 配布禁止
- 詳細は `docs/books-internal-api-spec.md` 冒頭

## 🔜 残課題（Optional）

1. **Scenario E 採取**: logs/履歴 endpoint の確定（TDD 用途では不要）
2. **Scenario G 採取**: Custom Schedule の CRUD endpoint
3. **Scenario H 採取**: Custom Button の CRUD endpoint
4. **Books 用 deluge-sync ツール化**: `zoho-deluge-sync` の Books 版実装
   - script wrapper 不要 / form 形式 / entity 必須 / save+execute 統合 等の差分を抽象化
