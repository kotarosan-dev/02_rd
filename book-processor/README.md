# Gmail書籍テキスト自動処理ツール

VFlatScanで作成した書籍テキストをGmail経由で取得し、処理用フォルダを自動作成します。  
**本番の一気通貫（未処理一覧 → 書評 → `processed` 移動 → git push）は Cursor/Claude の `book-to-note-pipeline` スキルが正**です。

## アーキテクチャ

```
VFlatScan（スマホ）
    ↓ Gmail送信
Gmail（添付ファイル）
    ↓ Google Apps Script（1分ごと自動）
Google Drive（VFlatScan_Booksフォルダ）
    ↓ Google Drive for Desktop（自動同期）
G:\マイドライブ\VFlatScan_Books\*.txt
    ↓ 【推奨】book-to-note-pipeline スキル（オーケストレーター）
       … 8冊／バッチ・サブエージェント最大4並列で article.md 執筆 → processed 移動
       … バッチごと git commit & push（同一プロンプト内でキューが空になるまで継続）
    ↓ 【補助】Watch-BookFiles.ps1（任意）
Books/YYYY/MM/YYYYMMDD_書籍名/source.txt へコピーのみ（既定では INBOX に元ファイルを残す）
```

## `processed` フォルダの意味

- **推奨**: 書評 `article.md` 作成が終わった**あと**に、取り込み元の `.txt` を `VFlatScan_Books\processed\` へ移す（スキルに手順あり）。
- **例外**: `Watch-BookFiles.ps1 -MoveToProcessedImmediately` を付けたときだけ、コピー直後に移動（旧挙動・取り込み専用バッチ向け）。

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

### Step 3: PowerShellスクリプト（補助）

`Watch-BookFiles.ps1` を編集して同期フォルダパスを設定（既定は `G:\マイドライブ` 基準）。

```powershell
# 1回だけ実行（Books にコピーのみ。元ファイルは INBOX に残る）
.\Watch-BookFiles.ps1

# 旧挙動：コピー後すぐ processed へ移動
.\Watch-BookFiles.ps1 -MoveToProcessedImmediately

# デーモンモード（常駐）
.\Watch-BookFiles.ps1 -Daemon

# ポーリング間隔変更（2分）
.\Watch-BookFiles.ps1 -Daemon -Interval 120
```

## 出力ファイル構造（現行）

```
Books/
└── YYYY/
    └── MM/
        └── YYYYMMDD_書籍名/
            ├── source.txt
            └── article.md   ← エージェント（book-review-chef 等）が追加
```

## 手動処理の実行方法（Cursor チャット）

**パスを指定しなくてよい。** 例:

```
書評を作って。溜まってる本、全部処理して。
```

エージェントは `book-to-note-pipeline` スキルに従い、`G:\マイドライブ\VFlatScan_Books` の未処理 `.txt` を列挙し、各冊 `article.md` 作成後に `processed` へ移し、最後に `git commit` / `git push` まで行う。

### 書評のみ明示する場合（フォルダが既にあるとき）

```
C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books\2026\03\20260322_書籍名
このフォルダのsource.txtを読み込んで、book-review-chef で書評を生成。出力: article.md
```

## 関連Skills

- **`book-to-note-pipeline`** — 未処理一括・processed 移動・git まで一気通貫（**メイン**）
- **`book-review-chef`** — 書評本文の品質・調査・参考文献検証
- **`git-ssh-push`** — `git push` 失敗時の SSH ホスト修正
- **`skill-extraction-template`** — 必要に応じてスキル抽出

## 費用

**¥0** - すべて無料サービスのみ使用
