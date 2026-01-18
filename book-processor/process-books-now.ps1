# process-books-now.ps1 - One-time book processing script
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$watchFolder = "G:\マイドライブ\VFlatScan_Books"
$outputFolder = "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\Books"
$processedFolder = "G:\マイドライブ\VFlatScan_Books\processed"
$date = Get-Date -Format "yyyyMMdd"

if (-not (Test-Path $processedFolder)) {
    New-Item -ItemType Directory -Path $processedFolder -Force | Out-Null
}

$files = Get-ChildItem -Path $watchFolder -File | Where-Object { $_.Extension -eq ".txt" }
Write-Host "Found $($files.Count) files"

foreach ($file in $files) {
    $bookTitle = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $bookTitle = $bookTitle -replace "^\d{8}_\d{6}_", ""
    $outputDir = Join-Path $outputFolder "${date}_${bookTitle}"

    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }

    $sourceCopy = Join-Path $outputDir "source.txt"
    Copy-Item $file.FullName $sourceCopy -Force

    $processedPath = Join-Path $processedFolder $file.Name
    Move-Item $file.FullName $processedPath -Force

    Write-Host "Processed: $bookTitle"
}
Write-Host "Done!"
