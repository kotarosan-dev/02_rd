---
name: Book Processor Script Execution
overview: Google Driveの同期フォルダを監視し、書籍テキストファイルを処理するPowerShellスクリプトを実行します。書評記事、要約、スキル抽出の3つのタスクを自動実行します。
todos: []
---

# Book Processor Script Execution Plan

## Overview

`Watch-BookFiles.ps1`スクリプトを実行し、Google Driveの`VFlatScan_Books`フォルダ内の書籍テキストファイル（`.txt`, `.text`, `.md`）を処理します。

## Execution Details

### Script Location

- **Script Path**: `C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\book-processor\Watch-BookFiles.ps1`

### Execution Mode

- **Default Mode**: ワンショット実行（`-Daemon`スイッチなし）
  - 監視フォルダを1回スキャンし、見つかったファイルを処理して終了
- **Alternative**: `-Daemon`スイッチでデーモンモード実行可能（15分間隔で継続監視）

### Processing Flow

1. **Configuration Check**

   - Watch Folder: `G:\マイドライブ\VFlatScan_Books`
   - Output Folder: `C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books`
   - Processed Folder: `G:\マイドライブ\VFlatScan_Books\processed`
   - Skills Folder: `$env:USERPROFILE\.claude\skills`

2. **File Detection**

   - 対象拡張子: `.txt`, `.text`, `.md`
   - ファイル名パターン: `YYYYMMDD_HHMMSS_<book-title>.txt`形式を想定

3. **Processing Tasks** (各ファイルに対して3つのタスクを実行)

   - **Task 1: Article Generation** (`book-review-chef`スキル使用)
     - 出力: `article.md` (棚橋スタイル書評、9セクション構成)
   - **Task 2: Summary Generation**
     - 出力: `summary.md` (要約、5セクション構成)
   - **Task 3: Skill Extraction** (`skill-extraction-template`スキル使用)
     - 出力: `$env:USERPROFILE\.claude\skills\<skill-name>/` ディレクトリ

4. **Output Structure**
   ```
   Books/
   └── YYYYMMDD_<book-title>/
       ├── source.txt (元ファイルのコピー)
       ├── article.md
       ├── summary.md
       └── processing_log.md
   ```

5. **Post-Processing**

   - 処理済みファイルを`processed`フォルダに移動
   - Windows通知で処理完了を通知

### Execution Command

```powershell
& "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\book-processor\Watch-BookFiles.ps1"
```

### Prerequisites Check

- `G:\マイドライブ\VFlatScan_Books`フォルダの存在確認
- `claude`コマンドの可用性確認（Claude Code CLI）
- 必要なスキルの存在確認（`book-review-chef`, `skill-extraction-template`）

### Expected Behavior

- 監視フォルダ内のファイルを検出・処理
- 各ファイルに対して3つのClaude Codeタスクを実行
- 処理結果をログファイルに記録
- 処理完了時にWindows通知を表示

## Notes

- UTF-8エンコーディング設定により日本語パスに対応
- エラーハンドリングが実装されており、個別タスクの失敗はログに記録される
- デーモンモードが必要な場合は、`-Daemon`スイッチを追加可能