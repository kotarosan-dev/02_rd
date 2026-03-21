# Watch-BookFiles.ps1
# VFlatScan_Books 直下のテキストを Books/YYYY/MM/YYYYMMDD_書名/source.txt にコピーする（補助用）
# 既定: 元ファイルは INBOX に残す（書評完了後に processed へ移すのはエージェント／手動）
# 旧挙動: -MoveToProcessedImmediately でコピー直後に processed へ移動

param(
    [switch]$Daemon,
    [int]$Interval = 900,
    [switch]$MoveToProcessedImmediately
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$driveRoot = "G:\マイドライブ"
$Config = @{
    WatchFolder     = "$driveRoot\VFlatScan_Books"
    OutputFolder    = "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books"
    ProcessedFolder = "$driveRoot\VFlatScan_Books\processed"
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

function Invoke-BookProcessing {
    param([string]$FilePath)

    $rawFileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $bookTitle = $rawFileName -replace '^\d{8}_\d{6}_', ''
    $ts = Get-Date -Format "yyyyMMdd"
    $year = Get-Date -Format "yyyy"
    $month = Get-Date -Format "MM"
    $outputDir = Join-Path $Config.OutputFolder (Join-Path $year (Join-Path $month "${ts}_${bookTitle}"))

    Write-Log "Processing: $bookTitle"

    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

    $sourceCopy = Join-Path $outputDir "source.txt"
    Copy-Item -LiteralPath $FilePath -Destination $sourceCopy -Force

    if ($MoveToProcessedImmediately) {
        $processedPath = Join-Path $Config.ProcessedFolder ([System.IO.Path]::GetFileName($FilePath))
        Move-Item -LiteralPath $FilePath -Destination $processedPath -Force
        Write-Log "Archived to processed: $processedPath"
    }

    Write-Log "Completed: $outputDir"
}

function Start-Processing {
    if (!(Test-Path -LiteralPath $Config.WatchFolder)) {
        Write-Log "Watch folder not found: $($Config.WatchFolder)"
        return
    }

    $files = @(Get-ChildItem -LiteralPath $Config.WatchFolder -File | Where-Object {
        $Config.Extensions -contains $_.Extension.ToLower()
    })

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
Write-Log "Output: $($Config.OutputFolder) (YYYY/MM/YYYYMMDD_title/)"
Write-Log "MoveToProcessedImmediately: $MoveToProcessedImmediately"

if ($Daemon) {
    Write-Log "Daemon mode (${Interval} sec). Ctrl+C to stop"
    while ($true) {
        try { Start-Processing } catch { Write-Log "Error: $_" }
        Start-Sleep -Seconds $Interval
    }
} else {
    Start-Processing
}
