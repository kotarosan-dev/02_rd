# Gmail書籍テキスト自動処理ツール

VFlatScanで作成した書籍テキストをGmail経由で取得し、処理用フォルダを自動作成します。
書評・スキル生成はCursorチャットで手動実行します。

## アーキテクチャ

```
VFlatScan（スマホ）
    ↓ Gmail送信
Gmail（添付ファイル）
    ↓ Google Apps Script（1分ごと自動）
Google Drive（VFlatScan_Booksフォルダ）
    ↓ Google Drive for Desktop（自動同期）
ローカルフォルダ
    ↓ PowerShellスクリプト（フォルダ作成・ファイルコピー）
Books/YYYYMMDD_書籍名/source.txt
    ↓ Cursorチャットで手動実行
article.md, summary.md, skill.md
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
    └── source.txt          # 元のテキスト（自動コピー）
```

## 手動処理の実行方法

PowerShellスクリプトでフォルダ作成後、Cursorチャットで以下のように依頼：

### 書評生成

```
C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books\20260110_書籍名
このフォルダのsource.txtを読み込んで、/book-review-chef スキルで書評を生成してください。
出力: article.md
```

### 要約生成

```
C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books\20260110_書籍名
このフォルダのsource.txtを読み込んで、要約を作成してください。
出力: summary.md

## 要約の構成
1. 一言で言うと（1行で本の核心）
2. 主要なポイント（3-5個の箇条書き）
3. 実践への示唆（読者が明日から使える3つのアクション）
4. 印象に残った引用（2-3個）
5. こんな人におすすめ（ターゲット読者像）
```

### スキル抽出

```
C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books\20260110_書籍名
このフォルダのsource.txtを読み込んで、/skill-extraction-template スキルでClaude Code用スキルを抽出してください。
出力先: C:\Users\user\.claude\skills\
```

## 関連Skills

- `/book-review-chef` - 書籍から棚橋スタイル書評を生成
- `/skill-extraction-template` - 書籍からSkillを抽出

## 費用

**¥0** - すべて無料サービスのみ使用
