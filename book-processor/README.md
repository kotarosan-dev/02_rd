# Gmail書籍テキスト自動処理ツール

VFlatScanで作成した書籍テキストをGmail経由で自動処理し、note記事やClaude Code Skillsを生成します。

## アーキテクチャ

```
VFlatScan（スマホ）
    ↓ Gmail送信
Gmail（添付ファイル）
    ↓ Google Apps Script（1分ごと自動）
Google Drive（VFlatScan_Booksフォルダ）
    ↓ Google Drive for Desktop（自動同期）
ローカルフォルダ
    ↓ PowerShellスクリプト
Claude Code CLI → 出力ファイル
```

## セットアップ

### Step 1: Google Apps Script設定

1. [script.google.com](https://script.google.com) にアクセス
2. 「新しいプロジェクト」を作成
3. `google-apps-script/GmailToDrive.gs` の内容を貼り付け
4. `setup()` を1回実行（フォルダ・ラベル作成）
5. トリガー設定:
   - 「トリガー」→「トリガーを追加」
   - 関数: `saveToDrive`
   - イベント: 時間主導型 → 分ベース → 1分

### Step 2: Google Drive for Desktop設定

1. [Google Drive for Desktop](https://www.google.com/drive/download/) をインストール
2. 同期オプションで「VFlatScan_Books」フォルダを選択
3. ローカルパスを確認（通常: `G:\マイドライブ\VFlatScan_Books`）

### Step 3: PowerShellスクリプト設定

`Watch-BookFiles.ps1` を編集して同期フォルダパスを設定:

```powershell
$Config = @{
    WatchFolder = "G:\マイドライブ\VFlatScan_Books"  # 環境に合わせて変更
    ...
}
```

### Step 4: 実行

```powershell
# 1回だけ実行
.\Watch-BookFiles.ps1

# デーモンモード（常駐）
.\Watch-BookFiles.ps1 -Daemon

# ポーリング間隔変更（2分）
.\Watch-BookFiles.ps1 -Daemon -Interval 120
```

## 出力ファイル構造

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

## 関連Skills

- `/book-article-generator` - 書籍からnote記事を生成
- `/skill-extraction-template` - 書籍からSkillを抽出

## 費用

**¥0** - すべて無料サービスのみ使用
