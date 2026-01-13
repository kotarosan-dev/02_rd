---
name: Book Processor Simplification
overview: book-processorスクリプトからClaude CLI呼び出し部分を削除し、Google Driveからのテキスト取得とフォルダ作成のみを行うシンプルな構成に変更する。
todos:
  - id: simplify-script
    content: Watch-BookFiles.ps1からClaude CLI呼び出し部分を削除し、フォルダ作成・ファイルコピーのみに簡素化
    status: completed
  - id: update-readme
    content: README.mdを新しいワークフロー（手動スキル実行）に合わせて更新
    status: completed
  - id: cleanup-files
    content: 不要になったRetry-FailedBooks.ps1の削除を検討
    status: completed
---

# Book Processor シンプル化計画

## 変更概要

[Watch-BookFiles.ps1](C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\book-processor\Watch-BookFiles.ps1) からClaude CLI呼び出し部分を削除し、以下の機能のみに簡素化する：

1. Google Driveの監視フォルダからテキストファイルを検出
2. `YYYYMMDD_書籍名` 形式のフォルダを作成
3. `source.txt` としてテキストをコピー
4. 元ファイルを `processed` フォルダに移動
5. 処理完了を通知

## 削除する部分

- `Invoke-BookProcessing` 関数内の以下を削除：
  - `$articlePrompt`, `$summaryPrompt`, `$skillPrompt` の定義（69-135行）
  - `$tasks` 配列と `foreach` ループでの `claude` CLI呼び出し（137-160行）
  - 処理結果の `$results` 管理
- スキル関連の設定（`SkillsFolder`）
- `Send-Notification` 関数（Windows通知は不要）

## 残す部分

- `$Config` の基本設定（WatchFolder, OutputFolder, ProcessedFolder, Extensions）
- `Write-Log` 関数
- フォルダ作成とファイルコピーのロジック
- デーモンモード対応

## 新しい処理フロー

```
Google Drive (VFlatScan_Books)
    ↓ 検出
テキストファイル（例: 20260110_123456_書籍名.txt）
    ↓ フォルダ作成
Books/20260110_書籍名/
    ├── source.txt  ← テキストコピー
    └── (article.md, summary.md, skill.md は手動で追加)
    ↓ 移動
processed/20260110_123456_書籍名.txt
    ↓ ログ出力
コンソールに「Completed: Books/20260110_書籍名」
```

## 手動実行の想定

スクリプト実行後、チャット上で以下のように依頼：

```
C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books\20260110_書籍名
このフォルダのsource.txtを処理してください。
/book-review-chef で書評を生成
/skill-extraction-template でスキル抽出
```

## 変更対象ファイル

- [Watch-BookFiles.ps1](C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\book-processor\Watch-BookFiles.ps1) - 主要な変更
- [README.md](C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\book-processor\README.md) - 使い方を更新
- `Retry-FailedBooks.ps1` - 不要になるため削除候補