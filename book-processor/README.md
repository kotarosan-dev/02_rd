# Gmail書籍テキスト自動処理ツール

VFlatScanで作成した書籍テキストをGmail経由で自動処理し、note記事やClaude Code Skillsを生成します。

## アーキテクチャ

```
VFlatScan（スマホ）
    ↓ Gmail送信
Gmail（添付ファイル）
    ↓ IMAP直接取得
Pythonスクリプト（ローカル常駐）
    ↓ Claude Code CLI呼び出し
出力ファイル
    ├── article.md（note記事）
    ├── summary.md（要約）
    └── skill/（抽出したSkill）
```

**特徴:**
- Google Drive for Desktop **不要**
- 外部サービス（Zapier/Make等）**不要**
- 完全無料（¥0）

## セットアップ

### 1. Gmailアプリパスワードの取得

Googleアカウントで2段階認証を有効化し、アプリパスワードを作成:

1. [Google アカウント](https://myaccount.google.com/) にアクセス
2. セキュリティ → 2段階認証プロセス を有効化
3. セキュリティ → アプリパスワード で新規作成
4. 生成された16文字のパスワードを保存

### 2. 環境変数の設定

PowerShellの場合:
```powershell
# 一時的な設定
$env:GMAIL_ADDRESS = "your@gmail.com"
$env:GMAIL_APP_PASSWORD = "xxxx xxxx xxxx xxxx"

# 永続的な設定（ユーザー環境変数）
[Environment]::SetEnvironmentVariable("GMAIL_ADDRESS", "your@gmail.com", "User")
[Environment]::SetEnvironmentVariable("GMAIL_APP_PASSWORD", "xxxx xxxx xxxx xxxx", "User")
```

### 3. Gmailでラベル作成

Gmailで「BookProcessed」ラベルを作成しておく（処理済みメールの管理用）

### 4. 実行

```powershell
# 1回だけ実行
python gmail_book_processor.py

# デーモンモード（常駐）
python gmail_book_processor.py --daemon

# ポーリング間隔を変更（デフォルト60秒）
python gmail_book_processor.py --daemon --interval 120
```

## 使い方

### VFlatScanからの送信

1. VFlatScanで書籍をスキャン
2. テキストファイルとしてエクスポート
3. Gmail経由で自分宛に送信
   - 件名に「書籍」「スキャン」「book」「vflat」等を含める

### 処理結果の確認

出力先: `C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\books\`

```
books/
└── 20260102_153000_書籍名/
    ├── source.txt          # 元のテキスト
    ├── article.md          # note記事
    ├── summary.md          # 要約
    ├── skill/              # Claude Code Skill
    │   ├── SKILL.md
    │   ├── agents/
    │   └── references/
    └── processing_log.md   # 処理結果ログ
```

## タスクスケジューラでの自動起動（オプション）

Windows起動時に自動実行する場合:

1. タスクスケジューラを開く
2. 「基本タスクの作成」
3. トリガー: 「ログオン時」
4. 操作: 「プログラムの開始」
   - プログラム: `pythonw.exe`
   - 引数: `C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\book-processor\gmail_book_processor.py --daemon`
   - 開始: `C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\book-processor`

## トラブルシューティング

### 「Login failed」エラー

- アプリパスワードを使用しているか確認
- 通常のGmailパスワードではIMAP接続できません

### 添付ファイルが検出されない

- VFlatScanからの送信時、件名に識別キーワードを含めてください
- 対応拡張子: `.txt`, `.text`, `.md`

### Claude Code処理が失敗する

- Claude Code CLIがインストールされているか確認
- `claude --version` で動作確認
- Skills（/book-article-generator等）が設定されているか確認

## 設定のカスタマイズ

`gmail_book_processor.py` 内の以下を編集:

```python
# VFlatScanメールの識別パターン
self.vflatscan_patterns = [
    "vflat",
    "スキャン",
    "scan",
    "書籍",
    "book"
]

# 出力ディレクトリ
self.output_base = Path(
    r"C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\books"
)
```

## 関連Skills

このツールは以下のSkillsと連携します:

- `/book-article-generator` - 書籍からnote記事を生成
- `/skill-extraction-template` - 書籍からSkillを抽出

## ログ

実行ログは `book_processor.log` に保存されます。
