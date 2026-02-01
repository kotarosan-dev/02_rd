# CRM × AI マッチング PoC 実装レポート

## 1. プロジェクト概要

### 1.1 目的
Zoho CRM上で求職者と求人のセマンティックマッチングを実現するPoCの構築

### 1.2 技術スタック
| レイヤー | 技術 | 役割 |
|---------|------|------|
| フロントエンド | Zoho CRM Widget (JavaScript) | マッチング結果の表示、CRMレコードとの連携 |
| API Gateway | Zoho CRM Connection | CORSを回避しつつ外部APIを呼び出す |
| バックエンド | Zoho Catalyst (Node.js, Advanced I/O) | APIエンドポイント提供、Pinecone連携 |
| ベクトルDB | Pinecone Integrated Inference | テキストの自動ベクトル化、類似検索 |

### 1.3 最終アーキテクチャ
```
┌─────────────────────────────────────────────────────────────┐
│  Zoho CRM                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CRM Widget (widget.js)                              │   │
│  │  - ZOHO.CRM.CONNECTION.invoke()                      │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  CRM Connection (catalyst_matching_api)              │   │
│  │  - Type: Custom Service                              │   │
│  │  - Auth: API Key (Header)                            │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTPS POST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Zoho Catalyst                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Advanced I/O Function (Express.js)                  │   │
│  │  - /search: マッチング検索                            │   │
│  │  - /upsert: レコード登録                              │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Pinecone                                                   │
│  - Integrated Inference (自動Embedding)                     │
│  - Namespace: jobs / jobseekers                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 初期仮説

### 2.1 技術選定の仮説

| 仮説 | 内容 | 結果 |
|------|------|------|
| H1 | Pinecone Integrated InferenceでEmbedding APIを省略できる | ✅ 成功 |
| H2 | Zoho Catalystでサーバーレス関数を簡単にデプロイできる | ✅ 成功（ただしAdvanced I/O必須） |
| H3 | CRMウィジェットから直接外部APIを呼び出せる | ❌ 失敗（CORS問題） |
| H4 | `whiteListedDomains`でCORS問題を解決できる | ❌ 失敗 |
| H5 | `ZOHO.CRM.HTTP`でCORS問題を解決できる | ❌ 失敗 |
| H6 | CRM Connectionで外部APIを呼び出せる | ✅ 成功（Custom Service型） |

### 2.2 想定していた課題
1. CRMウィジェットの開発環境セットアップ
2. Catalyst関数のデプロイ手順
3. Pinecone APIとの連携
4. CORSの取り扱い

---

## 3. 試行錯誤の記録

### 3.1 Catalyst関数のデプロイ

#### 3.1.1 問題: Basic I/O vs Advanced I/O
- **状況**: 初期テンプレートで作成した関数が `{"output":"Hello undefined"}` を返すのみ
- **原因**: Express.jsで複数エンドポイントを持つ関数はAdvanced I/Oが必要
- **解決**: Catalyst Consoleで関数を削除し、Advanced I/Oで再作成

#### 3.1.2 問題: ZIPファイル構造
- **状況**: `Invalid input value for catalyst-config.json` エラー
- **原因**: ZIPファイル内でcatalyst-config.jsonがサブフォルダに入っていた
- **解決**: ルートレベルに配置
```
ai_matching.zip
├── catalyst-config.json  ← ルートレベル必須
├── index.js
└── package.json
```

### 3.2 CORSとの戦い

#### 3.2.1 試行1: 直接fetch() ❌
- **状況**: ウィジェットから直接Catalyst APIをfetch()
- **結果**: `Access to fetch ... has been blocked by CORS policy`
- **原因**: ウィジェットのオリジン(`*.zappsusercontent.jp`)がCatalystで許可されていない

#### 3.2.2 試行2: Catalyst側でCORS設定 ❌
- **状況**: Express.jsでCORSミドルウェアを追加（`Access-Control-Allow-Origin: *`）
- **結果**: `The 'Access-Control-Allow-Origin' header contains multiple values`
- **原因**: Zoho側とCatalyst側の両方がCORSヘッダーを追加し、重複

#### 3.2.3 試行3: plugin-manifest.jsonのwhiteListedDomains ❌
- **状況**: `plugin-manifest.json`にCatalystドメインを追加
```json
"whiteListedDomains": ["https://ai-matching-poc-90002038385.development.catalystserverless.jp"]
```
- **結果**: 依然としてCORSエラー
- **原因**: `whiteListedDomains`はiframe内の外部コンテンツ読み込み用であり、fetch()には適用されない

#### 3.2.4 試行4: ZOHO.CRM.HTTP.post() ❌
- **状況**: Zoho SDK経由でHTTPリクエスト
- **結果**: `SyntaxError: Unexpected end of JSON input`
- **原因**: レスポンスの形式が期待と異なる

#### 3.2.5 試行5: Catalyst Console Authorized Domains ❌
- **状況**: Catalyst Console > Cloud Scale > Authentication > Whitelisting
- **結果**: `Invalid domain name` エラー
- **原因**: ワイルドカード（`*.zappsusercontent.jp`）は非対応。ウィジェットのオリジンは動的に変わるため、固定ドメインの登録では対応不可

#### 3.2.6 試行6: ZOHO.CRM.CONNECTION.invoke() + Zoho Catalyst Connection ❌
- **状況**: CRM設定で「Zoho Catalyst」タイプのConnectionを作成し、invoke()で呼び出し
- **結果**: `{statusMessage: 'Invalid Domain', status: 'false'}`
- **原因**: 「Zoho Catalyst」タイプのConnectionはCatalyst SDK API（Data Store, ZCQL等）専用であり、カスタムHTTPエンドポイントには使用不可

#### 3.2.7 試行7: ZOHO.CRM.CONNECTION.invoke() + Custom Service Connection ✅
- **状況**: CRM設定で「Custom Service」タイプのConnectionを作成
  - Service Name: `catalyst_matching_api`
  - Auth Type: API Key (Header)
  - Parameter Key: `X-Api-Key`
  - Base URL: Catalystの関数URL
- **結果**: `{code: 'SUCCESS', message: 'Connection invoked successfully'}`
- **成功要因**: Custom Service ConnectionはZohoサーバーがプロキシとなり、クライアント側CORSを完全に回避

### 3.3 Pinecone API形式

#### 3.3.1 問題: Upsert APIのリクエスト形式
- **状況**: `{"records": [...]}` 形式でPOST
- **結果**: `Missing or invalid field: _id` エラー
- **原因**: Pinecone Integrated Inference APIはNDJSON形式（各レコードを1行ずつ）を要求

#### 3.3.2 問題: テキストフィールド名
- **状況**: `chunk_text` フィールドを使用
- **結果**: `Missing field_mapping field 'text'` エラー
- **原因**: 作成時のIndex設定で`text`フィールドがEmbedding対象として指定されていた

#### 3.3.3 解決: 正しいUpsert形式
```javascript
// NDJSON形式（Content-Type: application/x-ndjson）
{"_id":"record_id","text":"埋め込み対象テキスト","metadata1":"value1"}
{"_id":"record_id2","text":"別のテキスト","metadata2":"value2"}
```

### 3.4 ウィジェットの表示問題

#### 3.4.1 問題: メタデータフィールド名の不一致
- **状況**: ウィジェットが`metadata.title`を探すが、Pineconeには`name`で保存
- **解決**: `createMatchCard()`関数をPineconeのフィールド名（`name`, `skills`, `location`, `salary`, `position`）に合わせて修正

#### 3.4.2 問題: レコードIDがCRM形式でない
- **状況**: Pineconeのテストデータが`job_001`形式で、CRMレコードが開けない
- **解決**: 実際のCRMレコードID（例: `13059000001662474`）でPineconeにデータを再登録

---

## 4. 成功した最終構成

### 4.1 CRM Connection設定
| 項目 | 値 |
|------|-----|
| Connection Name | `catalyst_matching_api` |
| Service Name | `catalyst_matching_api` |
| Service URL | `https://ai-matching-poc-90002038385.development.catalystserverless.jp` |
| Authentication Type | API Key |
| Parameter Type | Header |
| Parameter Key | `X-Api-Key` |

### 4.2 Catalyst関数構成
- **Type**: Advanced I/O
- **Stack**: Node.js 18
- **Framework**: Express.js
- **Endpoints**:
  - `GET /`: ヘルスチェック
  - `POST /search`: マッチング検索
  - `POST /upsert`: レコード登録

### 4.3 Pinecone Index構成
- **Index Type**: Integrated Inference
- **Embedding Model**: 自動（Index作成時に設定）
- **Namespaces**: `jobs`, `jobseekers`
- **Field Mapping**: `text` → Embedding対象

### 4.4 Widget SDK使用方法
```javascript
const response = await ZOHO.CRM.CONNECTION.invoke("catalyst_matching_api", {
  url: "https://...catalystserverless.jp/server/ai_matching/search",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  parameters: requestBody,  // オブジェクトをそのまま渡す（JSON.stringifyしない）
  param_type: 2  // 2 = request body
});

// レスポンスの取得
if (response.code === "SUCCESS") {
  const data = response.details.statusMessage;  // Catalyst関数のレスポンス本体
}
```

---

## 5. 学んだ教訓

### 5.1 CORS問題の本質
- CRMウィジェットは動的なサブドメイン（`*.zappsusercontent.jp`）で実行される
- サーバー側でワイルドカードCORS許可ができない場合、クライアント側のfetch()は機能しない
- **解決策**: サーバーサイドプロキシ（CRM Connection）を使用する

### 5.2 Zoho CRM Connectionの種類
| タイプ | 用途 | カスタムAPI対応 |
|--------|------|----------------|
| Zoho Catalyst | Catalyst SDK API（Data Store等） | ❌ |
| Zoho CRM | CRM API | ❌ |
| Custom Service | 任意のREST API | ✅ |

### 5.3 Catalyst関数のデプロイ
- Express.jsで複数エンドポイントを持つ場合は**Advanced I/O**必須
- `catalyst-config.json`はZIPのルートレベルに配置
- 環境変数はCatalyst Console > Settings > Environment Variablesで設定

### 5.4 Pinecone Integrated Inference
- リクエスト形式: NDJSON（`application/x-ndjson`）
- Embeddingフィールド名はIndex作成時の`field_map`に依存
- レコードIDは`_id`フィールドで指定

---

## 6. ファイル一覧

### 6.1 CRMウィジェット
```
02_テスト/crm-widget/
├── plugin-manifest.json   # ウィジェット設定
└── app/
    ├── widget.html        # エントリーポイント
    ├── css/widget.css     # スタイル
    └── js/widget.js       # ロジック（v1.7.0）
```

### 6.2 Catalyst関数
```
02_テスト/catalyst-upload/
├── catalyst-config.json   # Catalyst設定
├── index.js               # Express.jsアプリケーション
└── package.json           # 依存関係
```

### 6.3 データ登録スクリプト
```
02_テスト/
├── register_jobs_direct.js  # Pineconeへの求人登録
└── delete_old_jobs.js       # 旧データ削除
```

---

## 7. 再現手順（サマリー）

1. **Pinecone**: Integrated Inference Index作成、Namespaces設定
2. **Catalyst**: Advanced I/O関数作成、環境変数設定、ZIPアップロード
3. **CRM Connection**: Custom Service型で作成、Base URL設定
4. **Widget**: `ZOHO.CRM.CONNECTION.invoke()`でAPI呼び出し
5. **データ登録**: NDJSON形式でPineconeにupsert

---

## 8. 今後の課題

1. **自動同期**: CRMレコード作成時にPineconeへ自動登録（ワークフロー連携）
2. **双方向検索**: 求人側からも求職者を検索
3. **スコアリング改善**: 閾値設定、重み付けカスタマイズ
4. **UI改善**: ソート、フィルタリング、ページネーション
5. **本番環境**: Catalyst Production環境へのデプロイ

---

*作成日: 2026-02-01*
*バージョン: 1.0*
