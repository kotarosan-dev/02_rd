# CRM×AI マッチングシステム PoC セットアップガイド

## 概要

このPoCでは、Zoho CRMの求職者・求人データをAIでマッチングし、レコメンデーションを表示するシステムを構築します。

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     Zoho CRM                                │
│  ┌───────────────┐     ┌────────────────────────────────┐  │
│  │ JobSeekers    │────▶│ 関連リストウィジェット          │  │
│  │ Jobs          │     │ 「おすすめマッチング Top5」     │  │
│  └───────────────┘     └────────────────────────────────┘  │
└────────────────────────────│────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Zoho Catalyst (Python Function)                 │
│  - OpenAI Embeddings でベクトル化                           │
│  - Pinecone で類似検索                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## デプロイ方法の整理

| 対象 | 方法 | 備考 |
|------|------|------|
| **Catalyst 関数** | **ZIP をアップロード** | Serverless > Functions > 該当関数 > コードを ZIP でアップロード。スクリプト `02_テスト/catalyst-function/pack-for-upload.ps1` で ZIP 作成可。 |
| **CRM ウィジェット** | **ZET pack** | `zet pack` でパッケージ化し、`dist/` にできた ZIP を CRM の「ウィジェットを作成」からアップロード。 |

- 関数は以前どおり ZIP でアップロードする運用で問題ありません。
- ウィジェットは ZET CLI で `zet pack` した成果物をアップロードする必要があります。

---

## 1. 事前準備

### 1.1 必要なもの

| 項目 | 状態 |
|------|------|
| Zoho One / CRM Enterprise以上 | ✅ 確認済み |
| OpenAI API Key | ✅ 設定済み（`.env`） |
| Pinecone API Key + Index | ✅ 設定済み（`.env`） |
| Node.js v18以上 | 要確認 |
| Python 3.9以上 | 要確認 |

### 1.2 .env の配置（環境の分離）

- **デフォルト（その他組織）:** **`03_実装/config/.env`** に配置。`03_実装/config/.env.example` をコピーして作成し、`ZOHO_ORG_ID` など必要な値を記入する。
- **demo3 専用:** **`03_実装/config/.env.demo3`** に配置。`03_実装/config/.env.demo3.example` をコピーして `.env.demo3` を作成し、demo3 用の Client ID / Client Secret を記入する（組織IDは 90001202404 で固定）。  
  CRM モジュールセットアップを **demo3 向けに実行するとき**は、必ず次のように指定する。
  ```powershell
  cd "02_テスト\scripts"
  python setup_crm_modules.py --env demo3
  ```
  `--env demo3` を付けない場合は `.env` が読み込まれ、別組織向けになる。

### 1.3 ローカル環境確認

```powershell
# Node.js確認
node -v
npm -v

# Python確認
python --version

# ZET CLI（ウィジェット用）
npm install -g zoho-extension-toolkit
zet --version

# Catalyst CLI
npm install -g zcatalyst-cli
catalyst --version
```

---

## 2. CRMモジュール作成（GUI）

### 2.1 求職者モジュール（JobSeekers）

**設定 > カスタマイズ > モジュールとフィールド > 新しいモジュール**

| フィールド名 | API名 | タイプ | 必須 |
|-------------|-------|--------|------|
| 氏名 | Name | 単一行 | ✅ |
| スキル | Skills | 複数行 | |
| 経験年数 | Experience_Years | 数値 | |
| 希望職種 | Desired_Position | 単一行 | |
| 希望勤務地 | Desired_Location | 単一行 | |
| 希望年収 | Desired_Salary | 数値 | |
| 自己PR | Self_PR | 複数行 | |

### 2.2 求人モジュール（Jobs）

| フィールド名 | API名 | タイプ | 必須 |
|-------------|-------|--------|------|
| 求人タイトル | Name | 単一行 | ✅ |
| 必要スキル | Required_Skills | 複数行 | |
| 必要経験年数 | Required_Experience | 数値 | |
| 職種 | Position | 単一行 | |
| 勤務地 | Location | 単一行 | |
| 年収下限 | Salary_Min | 数値 | |
| 年収上限 | Salary_Max | 数値 | |
| 仕事内容 | Description | 複数行 | |

---

## 3. Catalyst関数セットアップ

### 3.1 Catalystプロジェクト作成（GUI）

1. https://catalyst.zoho.com にアクセス
2. 「Create Project」をクリック
3. プロジェクト名: `ai-matching-poc`
4. リージョン: Japan（推奨）

### 3.2 ローカル初期化

```powershell
# プロジェクトディレクトリへ移動
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\CRM-AI-Matching-PoC\02_テスト\catalyst-function"

# Catalyst CLIログイン
catalyst login

# プロジェクト初期化（既存プロジェクトに接続）
catalyst init
# → Organization を選択
# → Project: ai-matching-poc を選択
# → Functions を選択
# → Python を選択
```

### 3.3 環境変数設定

```powershell
# .envファイルをfunctionsフォルダにコピー
copy "..\..\03_実装\config\.env" ".\.env"
```

### 3.4 依存関係インストール

```powershell
# 仮想環境作成
python -m venv venv

# 仮想環境有効化（Windows）
.\venv\Scripts\Activate.ps1

# 依存関係インストール
pip install -r requirements.txt
```

### 3.5 ローカルテスト

```powershell
# テスト実行
python main.py
```

期待される出力:
```
=== Upserting test data ===
Upserted jobseeker jobseeker_001 to Pinecone
Upserted job job_001 to Pinecone

=== Searching matches ===
Matches for jobseeker_001: [...]
```

### 3.6 開発環境デプロイ

**方法A: Catalyst CLI**
```powershell
catalyst deploy
```

**方法B: ZIP をコンソールからアップロード（従来どおり）**
```powershell
# ZIP を作成（main.py, requirements.txt, catalyst-config.json のみ含む）
.\pack-for-upload.ps1
# → ai_matching_function.zip が同じフォルダにできる

# Catalyst コンソール > Serverless > Functions > ai_matching
# → Code タブ > 該当の「アップロード」から上記 ZIP をアップロード
```

---

## 4. CRMウィジェットセットアップ

### 4.1 ローカルテスト

```powershell
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\CRM-AI-Matching-PoC\02_テスト\crm-widget"

# ローカルサーバー起動
zet run
```

ブラウザで `http://127.0.0.1:5000/app/widget.html` を開いて表示確認。

### 4.2 Catalyst関数URLの更新

`app/js/main.js` の `CONFIG.MATCHING_API_URL` をデプロイ後のURLに更新:

```javascript
const CONFIG = {
  MATCHING_API_URL: 'https://ai-matching-poc-xxxxxxxxx.catalyst.zoho.com/server/ai-matching-function',
  MOCK_MODE: false  // ← falseに変更
};
```

### 4.3 パッケージ化（ZET pack 必須）

ウィジェットは **ZET CLI でパックする必要があります**。ZIP を手で作るだけでは不足です。

```powershell
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\CRM-AI-Matching-PoC\02_テスト\crm-widget"
zet pack
```

`dist/` フォルダにZIPファイルが生成されます。このZIPをCRMにアップロードしてください。

### 4.4 CRMにアップロード

1. **CRM > 設定 > 開発者向け情報 > ウィジェット**
2. **「+ ウィジェットを作成」**
3. 以下を入力:
   - 名前: `AI Matching Widget`
   - 説明: `求職者・求人のAIマッチング`
   - ホスティングタイプ: **Zoho**
   - ZIPファイルをアップロード
   - インデックスURL: `/app/widget.html`
4. **保存**

### 4.5 関連リストに配置

1. **設定 > カスタマイズ > モジュールとフィールド > JobSeekers**
2. **関連リスト > 新しい関連リスト（ウィジェット）**
3. ウィジェット: `AI Matching Widget`
4. 関連リスト名: `おすすめ求人`
5. **保存**

同様に **Jobs** モジュールにも配置（関連リスト名: `おすすめ候補者`）

---

## 5. テストデータ投入

### 5.1 CRMにサンプルデータを登録

**JobSeekers:**
| 氏名 | スキル | 経験年数 | 希望職種 | 希望勤務地 | 希望年収 |
|------|--------|---------|---------|-----------|---------|
| 田中太郎 | Python, AWS, Docker | 5 | バックエンドエンジニア | 東京 | 600 |
| 佐藤花子 | JavaScript, React, Node.js | 3 | フロントエンドエンジニア | 東京 | 500 |
| 鈴木一郎 | Java, Spring Boot, MySQL | 7 | テックリード | 大阪 | 800 |

**Jobs:**
| 求人タイトル | 必要スキル | 必要経験 | 勤務地 | 年収下限 | 年収上限 |
|-------------|-----------|---------|-------|---------|---------|
| シニアバックエンドエンジニア | Python, AWS | 3 | 東京 | 500 | 800 |
| フロントエンドエンジニア | React, TypeScript | 2 | 東京 | 400 | 600 |
| テックリード | Java, マネジメント経験 | 5 | 大阪 | 700 | 1000 |

### 5.2 Pineconeにデータ同期

```powershell
# Catalyst関数のupsertエンドポイントを呼び出し
# または main.py のテストコードを実行
python main.py
```

---

## 6. 動作確認

1. CRMで **JobSeekers** モジュールを開く
2. 任意のレコードを開く
3. 関連リスト「おすすめ求人」が表示される
4. マッチング度（%）付きで求人候補が表示される

---

## 7. トラブルシューティング

### ウィジェットが表示されない

1. ブラウザのコンソールでエラー確認（F12）
2. `ZOHO.embeddedApp.init()` が正しく呼ばれているか確認
3. plugin-manifest.json の `modules` にモジュール名が含まれているか確認

### マッチング結果が0件

1. Pineconeにデータが登録されているか確認
   ```python
   stats = pinecone_index.describe_index_stats()
   print(stats)
   ```
2. namespace が正しいか確認（`jobseekers` / `jobs`）

### API呼び出しエラー

1. Catalyst関数のログを確認（Catalystコンソール > Logs）
2. 環境変数が正しく設定されているか確認
3. OpenAI/Pinecone APIキーの有効性を確認

---

## 8. 次のステップ

### 短期改善
- [ ] CRMレコード保存時に自動でPinecone同期（ワークフロー連携）
- [ ] マッチングスコアの可視化改善
- [ ] ウィジェットからのレコード詳細表示

### 中期改善
- [ ] マッチング条件のカスタマイズUI
- [ ] マッチング履歴の保存
- [ ] バッチ処理でのデータ同期

### 長期改善
- [ ] 機械学習によるスコアリング精度向上
- [ ] 複数条件でのフィルタリング
- [ ] レポート・分析機能

---

## 参考リンク

- [Zoho Catalyst ドキュメント](https://docs.catalyst.zoho.com/)
- [Zoho CRM ウィジェット開発](https://www.zoho.com/crm/developer/docs/widgets/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Pinecone ドキュメント](https://docs.pinecone.io/)
