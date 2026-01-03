# Gmail書籍テキスト自動処理ツール

VFlatScanで作成した書籍テキストをGmail経由で自動処理し、棚橋スタイル書評やClaude Code Skillsを生成します。

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
Books/
└── 20260102_書籍名/
    ├── source.txt          # 元のテキスト
    ├── article.md          # 棚橋スタイル書評（95点以上品質）
    ├── summary.md          # 要約
    ├── skill/              # Claude Code Skill
    │   ├── SKILL.md
    │   ├── agents/
    │   └── references/
    └── processing_log.md   # 処理結果ログ
```

## 関連Skills

- `/book-review-chef` - 書籍から棚橋スタイル書評を生成（95点以上の品質）
- `/skill-extraction-template` - 書籍からSkillを抽出

## 生成される書評の構成と品質基準

book-review-chefスキルは「紹介記事」ではなく「書評」を生成します。

### 9セクション構成

| # | セクション | 目的 |
|---|-----------|------|
| 1 | タイトル | 思想的・学術的な問いを含む |
| 2 | 思想的系譜への位置づけ | 先行思想家から始動（冒頭） |
| 3 | 書誌情報 | 書名、著者、出版社、Amazonリンク |
| 4 | 本書の核心 | 先行理論との共鳴・対話 |
| 5 | 批判的検討 | 前提・価値観自体への問い |
| 6 | 時代的意義 | なぜ今この本か |
| 7 | 残された問い | 読者への問いで終わる |
| 8 | 結語 | メタ構造への言及 |
| 9 | 参考文献 | 学術的書誌情報（3-5件） |

### 品質要件（すべて満たすこと）

| 要件 | 説明 |
|-----|------|
| 思想史から始動 | 冒頭は先行思想家から始める（「こんな経験はないだろうか」は禁止） |
| 批評家の声 | 「私が注目したのは」「私は〜として読む」 |
| 思想的系譜 | 先行思想家2名以上への接続 |
| 構造的批判 | 本書の前提・価値観自体への問い |
| メタ構造 | 「この書評自体が〜」への言及 |
| 問いを残す | 読者への問いで終わる |

## 費用

**¥0** - すべて無料サービスのみ使用
