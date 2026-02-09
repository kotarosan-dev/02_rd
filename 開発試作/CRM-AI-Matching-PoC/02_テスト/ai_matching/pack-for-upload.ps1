# Node.js ai_matching を ZIP でパック（コンソールアップロード用）
# 使い方: .\pack-for-upload.ps1
# 出力: ai_matching_node.zip（このフォルダと同じ階層）

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$zipName = "ai_matching_node.zip"
$zipPath = Join-Path $root $zipName

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$include = @(
    "catalyst-config.json",
    "index.js",
    "package.json",
    "package-lock.json",
    "node_modules"
)

Push-Location $root
try {
    $tempDir = Join-Path $env:TEMP "catalyst-ai-matching-node-$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    foreach ($item in $include) {
        if (Test-Path $item) {
            Copy-Item $item -Destination $tempDir -Recurse -Force
        }
    }
    Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -Force
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Created: $zipPath"
} finally {
    Pop-Location
}
