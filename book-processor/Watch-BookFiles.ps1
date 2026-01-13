# Watch-BookFiles.ps1
# Monitor Google Drive sync folder and prepare book folders for manual processing

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
    $outputDir = Join-Path $Config.OutputFolder "$ts`_$bookTitle"

    Write-Log "Processing: $bookTitle"

    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

    $sourceCopy = Join-Path $outputDir "source.txt"
    Copy-Item $FilePath $sourceCopy

    $processedPath = Join-Path $Config.ProcessedFolder ([System.IO.Path]::GetFileName($FilePath))
    Move-Item $FilePath $processedPath -Force

    Write-Log "Completed: $outputDir"
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
