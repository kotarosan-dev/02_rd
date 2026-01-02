# Watch-BookFiles.ps1
# Google Drive同期フォルダを監視し、新規ファイルをClaude Codeで処理
#
# 使い方:
#   .\Watch-BookFiles.ps1                    # 通常実行
#   .\Watch-BookFiles.ps1 -Daemon            # 常駐モード
#   .\Watch-BookFiles.ps1 -Interval 120      # 2分間隔

param(
    [switch]$Daemon,
    [int]$Interval = 60
)

# 設定
$Config = @{
    # Google Drive同期フォルダ（環境に合わせて変更）
    WatchFolder = "$env:USERPROFILE\Google Drive\VFlatScan_Books"

    # 出力先
    OutputFolder = "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\books"

    # 処理済みファイルの移動先
    ProcessedFolder = "$env:USERPROFILE\Google Drive\VFlatScan_Books\processed"

    # 対象拡張子
    Extensions = @(".txt", ".text", ".md")
}

# 出力フォルダ作成
if (!(Test-Path $Config.OutputFolder)) {
    New-Item -ItemType Directory -Path $Config.OutputFolder -Force | Out-Null
}
if (!(Test-Path $Config.ProcessedFolder)) {
    New-Item -ItemType Directory -Path $Config.ProcessedFolder -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

function Process-BookFile {
    param([string]$FilePath)

    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $outputDir = Join-Path $Config.OutputFolder "${timestamp}_${fileName}"

    Write-Log "処理開始: $fileName"

    # 出力ディレクトリ作成
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

    # ソースファイルをコピー
    $sourceCopy = Join-Path $outputDir "source.txt"
    Copy-Item $FilePath $sourceCopy

    # タスク定義
    $tasks = @(
        @{
            Name = "article"
            Prompt = @"
この書籍テキストからnote記事を生成してください。
/book-article-generator スキルを使用して、読者の「問い」を起点にした記事を作成してください。

書籍名: $fileName
テキストファイル: $sourceCopy

出力先: $(Join-Path $outputDir 'article.md')
"@
        },
        @{
            Name = "summary"
            Prompt = @"
この書籍テキストの要約を作成してください。

以下の構成で:
1. 一言で言うと（1行）
2. 主要なポイント（3-5個）
3. 実践への示唆（3個）
4. 印象に残った引用（2-3個）

書籍名: $fileName
出力先: $(Join-Path $outputDir 'summary.md')
"@
        },
        @{
            Name = "skill"
            Prompt = @"
この書籍からClaude Code用のSkillを抽出してください。
/skill-extraction-template スキルを使用してください。

書籍名: $fileName
出力先ディレクトリ: $(Join-Path $outputDir 'skill')
"@
        }
    )

    $results = @{}

    foreach ($task in $tasks) {
        Write-Log "  タスク: $($task.Name)"

        try {
            $result = & claude -p $task.Prompt --allowedTools Read Write Edit Glob Grep Bash 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Log "  完了: $($task.Name)"
                $results[$task.Name] = "success"
            } else {
                Write-Log "  失敗: $($task.Name)"
                $results[$task.Name] = "failed"
            }
        } catch {
            Write-Log "  エラー: $($task.Name) - $_"
            $results[$task.Name] = "error"
        }
    }

    # 処理ログ保存
    $logContent = @"
# 処理結果

- 処理日時: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
- 書籍名: $fileName
- 元ファイル: $FilePath

## タスク結果

| タスク | 結果 |
|--------|------|
"@
    foreach ($key in $results.Keys) {
        $logContent += "| $key | $($results[$key]) |`n"
    }

    $logPath = Join-Path $outputDir "processing_log.md"
    $logContent | Out-File -FilePath $logPath -Encoding UTF8

    # 処理済みフォルダに移動
    $processedPath = Join-Path $Config.ProcessedFolder ([System.IO.Path]::GetFileName($FilePath))
    Move-Item $FilePath $processedPath -Force

    Write-Log "処理完了: $outputDir"
}

function Run-Once {
    # 監視フォルダ確認
    if (!(Test-Path $Config.WatchFolder)) {
        Write-Log "監視フォルダが存在しません: $($Config.WatchFolder)"
        Write-Log "Google Drive for Desktop の同期を確認してください"
        return
    }

    # ファイル検索
    $files = Get-ChildItem -Path $Config.WatchFolder -File | Where-Object {
        $Config.Extensions -contains $_.Extension.ToLower()
    }

    if ($files.Count -eq 0) {
        Write-Log "処理対象のファイルはありません"
        return
    }

    Write-Log "検出: $($files.Count)件のファイル"

    foreach ($file in $files) {
        Process-BookFile -FilePath $file.FullName
    }
}

# メイン処理
Write-Log "=== Gmail書籍処理ツール（Google Drive版）==="
Write-Log "監視フォルダ: $($Config.WatchFolder)"
Write-Log "出力フォルダ: $($Config.OutputFolder)"

if ($Daemon) {
    Write-Log "デーモンモード開始（${Interval}秒間隔）"
    Write-Log "Ctrl+C で停止"

    while ($true) {
        try {
            Run-Once
        } catch {
            Write-Log "エラー: $_"
        }
        Start-Sleep -Seconds $Interval
    }
} else {
    Run-Once
}
