# Watch-BookFiles.ps1
# Monitor Google Drive sync folder and process with Claude Code

param(
    [switch]$Daemon,
    [int]$Interval = 900
)

# UTF-8エンコーディング設定（日本語パス対応）
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$driveRoot = "G:\マイドライブ"
$Config = @{
    WatchFolder     = "$driveRoot\VFlatScan_Books"
    OutputFolder    = "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books"
    ProcessedFolder = "$driveRoot\VFlatScan_Books\processed"
    SkillsFolder    = "$env:USERPROFILE\.claude\skills"
    Extensions      = @(".txt", ".text", ".md")
}

if (!(Test-Path $Config.OutputFolder)) {
    New-Item -ItemType Directory -Path $Config.OutputFolder -Force | Out-Null
}
if (!(Test-Path $Config.ProcessedFolder)) {
    New-Item -ItemType Directory -Path $Config.ProcessedFolder -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] $Message"
}

function Send-Notification {
    param([string]$Title, [string]$Message)
    Add-Type -AssemblyName System.Windows.Forms
    $balloon = New-Object System.Windows.Forms.NotifyIcon
    $balloon.Icon = [System.Drawing.SystemIcons]::Information
    $balloon.BalloonTipIcon = "Info"
    $balloon.BalloonTipTitle = $Title
    $balloon.BalloonTipText = $Message
    $balloon.Visible = $true
    $balloon.ShowBalloonTip(5000)
    Start-Sleep -Milliseconds 5500
    $balloon.Dispose()
}

function Invoke-BookProcessing {
    param([string]$FilePath)

    $rawFileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $bookTitle = $rawFileName -replace '^\d{8}_\d{6}_', ''
    $ts = Get-Date -Format "yyyyMMdd"
    $outputDir = Join-Path $Config.OutputFolder "$ts`_$bookTitle"

    Write-Log "Processing: $bookTitle"

    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

    $sourceCopy = Join-Path $outputDir "source.txt"
    Copy-Item $FilePath $sourceCopy

    $articleOut = Join-Path $outputDir "article.md"
    $summaryOut = Join-Path $outputDir "summary.md"
    $skillOut = $Config.SkillsFolder

    $articlePrompt = @"
/book-review-chef

書籍テキストファイル: $sourceCopy
出力先: $articleOut

上記の書籍テキストを読み込み、book-review-chefスキルに従って棚橋スタイル書評を生成してください。

## 必須事項
1. WebSearchを使用して思想的系譜・批判的言説を調査する
2. 棚橋スタイル書評構成（9セクション）に従う
3. 「紹介記事」ではなく「書評」を生成する

## 9セクション構成（必須）
1. タイトル - 思想的・学術的な問いを含む
2. 思想的系譜への位置づけ - 先行思想家から始動（冒頭）
3. 書誌情報 - 書名、著者、出版社、Amazonリンク
4. 本書の核心 - 先行理論との共鳴・対話
5. 批判的検討 - 前提・価値観自体への問い
6. 時代的意義 - なぜ今この本か
7. 残された問い - 読者への問いで終わる
8. 結語 - メタ構造への言及
9. 参考文献 - 学術的書誌情報（3-5件）

## 品質要件（すべて満たすこと）
- 冒頭は思想史から始動（「こんな経験はないだろうか」は禁止）
- 批評家の声（「私が注目したのは」「私は〜として読む」）
- 思想的系譜への接続（先行思想家2名以上）
- 構造的批判（本書の前提・価値観自体への問い）
- メタ構造への言及（「この書評自体が〜」）
- 問いを残す終わり方
"@

    $summaryPrompt = @"
以下の書籍テキストファイルを読み込み、要約を作成してください。

入力ファイル: $sourceCopy
出力ファイル: $summaryOut

## 要約の構成（必須）

1. 一言で言うと（1行で本の核心）
2. 主要なポイント（3-5個の箇条書き）
3. 実践への示唆（読者が明日から使える3つのアクション）
4. 印象に残った引用（2-3個、ページ番号があれば記載）
5. こんな人におすすめ（ターゲット読者像）

Markdown形式で出力してください。
"@

    $skillPrompt = @"
/skill-extraction-template

書籍テキストファイル: $sourceCopy
出力先ディレクトリ: $skillOut

上記の書籍からClaude Code用のSkillを抽出してください。
skill-extraction-templateスキルに従い、以下の構造で出力してください：

出力先/[skill-name]/
├── SKILL.md
├── agents/
└── references/

skill-nameは書籍の内容から適切な英語のスラッグ名を決定してください（例: science-communication, negotiation-tactics）。
このディレクトリはClaude Codeのグローバルスキルとして登録されます。
"@

    $tasks = @(
        @{ Name = "article"; Prompt = $articlePrompt }
        @{ Name = "summary"; Prompt = $summaryPrompt }
        @{ Name = "skill"; Prompt = $skillPrompt }
    )

    $results = @{}

    foreach ($task in $tasks) {
        Write-Log "  Task: $($task.Name)"
        try {
            $null = & claude -p $task.Prompt --allowedTools Read Write Edit Glob Grep Bash WebSearch WebFetch 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "  Done: $($task.Name)"
                $results[$task.Name] = "success"
            } else {
                Write-Log "  Failed: $($task.Name)"
                $results[$task.Name] = "failed"
            }
        } catch {
            Write-Log "  Error: $($task.Name) - $_"
            $results[$task.Name] = "error"
        }
    }

    $logLines = @("# Processing Result", "", "- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')", "- Book: $bookTitle", "- Source: $FilePath", "", "## Results", "")
    foreach ($key in $results.Keys) {
        $logLines += "- $key`: $($results[$key])"
    }

    $logPath = Join-Path $outputDir "processing_log.md"
    $logLines | Out-File -FilePath $logPath -Encoding UTF8

    $processedPath = Join-Path $Config.ProcessedFolder ([System.IO.Path]::GetFileName($FilePath))
    Move-Item $FilePath $processedPath -Force

    Write-Log "Completed: $outputDir"

    $successCount = ($results.Values | Where-Object { $_ -eq "success" }).Count
    Send-Notification "Book Processing Complete" "$bookTitle - $successCount/3 tasks succeeded"
}

function Start-Processing {
    if (!(Test-Path $Config.WatchFolder)) {
        Write-Log "Watch folder not found: $($Config.WatchFolder)"
        return
    }

    $files = Get-ChildItem -Path $Config.WatchFolder -File | Where-Object {
        $Config.Extensions -contains $_.Extension.ToLower()
    }

    if ($files.Count -eq 0) {
        Write-Log "No files to process"
        return
    }

    Write-Log "Found: $($files.Count) file(s)"

    foreach ($file in $files) {
        Invoke-BookProcessing -FilePath $file.FullName
    }
}

Write-Log "=== Book Processor (Google Drive) ==="
Write-Log "Watch: $($Config.WatchFolder)"
Write-Log "Output: $($Config.OutputFolder)"

if ($Daemon) {
    Write-Log "Daemon mode ($Interval sec). Ctrl+C to stop"
    while ($true) {
        try { Start-Processing } catch { Write-Log "Error: $_" }
        Start-Sleep -Seconds $Interval
    }
} else {
    Start-Processing
}
