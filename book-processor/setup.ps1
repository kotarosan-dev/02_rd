# Gmail書籍処理ツール セットアップスクリプト

Write-Host "=== Gmail書籍処理ツール セットアップ ===" -ForegroundColor Cyan
Write-Host ""

# 現在の環境変数を確認
$currentAddress = [Environment]::GetEnvironmentVariable("GMAIL_ADDRESS", "User")
$currentPassword = [Environment]::GetEnvironmentVariable("GMAIL_APP_PASSWORD", "User")

if ($currentAddress) {
    Write-Host "現在の設定:" -ForegroundColor Yellow
    Write-Host "  GMAIL_ADDRESS: $currentAddress"
    Write-Host "  GMAIL_APP_PASSWORD: ********(設定済み)"
    Write-Host ""

    $response = Read-Host "設定を上書きしますか？ (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "セットアップをキャンセルしました"
        exit
    }
}

Write-Host ""
Write-Host "Gmailアドレスを入力してください:" -ForegroundColor Green
$gmailAddress = Read-Host

Write-Host ""
Write-Host "Gmailアプリパスワードを入力してください:" -ForegroundColor Green
Write-Host "(アプリパスワードの取得方法: https://myaccount.google.com/ → セキュリティ → アプリパスワード)" -ForegroundColor Gray
$gmailPassword = Read-Host

# 環境変数を設定
[Environment]::SetEnvironmentVariable("GMAIL_ADDRESS", $gmailAddress, "User")
[Environment]::SetEnvironmentVariable("GMAIL_APP_PASSWORD", $gmailPassword, "User")

Write-Host ""
Write-Host "環境変数を設定しました！" -ForegroundColor Green
Write-Host ""

# 現在のセッションにも適用
$env:GMAIL_ADDRESS = $gmailAddress
$env:GMAIL_APP_PASSWORD = $gmailPassword

# 出力ディレクトリ作成
$outputDir = "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\books"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "出力ディレクトリを作成しました: $outputDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== セットアップ完了 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "使い方:" -ForegroundColor Yellow
Write-Host "  1回だけ実行:     python gmail_book_processor.py"
Write-Host "  デーモンモード:  python gmail_book_processor.py --daemon"
Write-Host ""
Write-Host "テスト実行しますか？ (y/N)" -ForegroundColor Green
$testRun = Read-Host

if ($testRun -eq "y" -or $testRun -eq "Y") {
    Write-Host ""
    Write-Host "テスト実行中..." -ForegroundColor Yellow
    python "$PSScriptRoot\gmail_book_processor.py"
}
