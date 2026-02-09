# Catalyst 関数を ZIP でパック（コンソールアップロード用）
# 使い方: .\pack-for-upload.ps1
# 出力: ai_matching_function.zip（このフォルダと同じ階層に作成）

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$zipName = "ai_matching_function.zip"
$zipPath = Join-Path $root $zipName

# 既存ZIPを削除
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$include = @(
    "main.py",
    "requirements.txt",
    "catalyst-config.json"
)

Push-Location $root
try {
    $tempDir = Join-Path $env:TEMP "catalyst-ai-matching-pack-$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    foreach ($f in $include) {
        if (Test-Path $f) {
            Copy-Item $f -Destination $tempDir -Force
        }
    }
    Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -Force
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Created: $zipPath"
} finally {
    Pop-Location
}
