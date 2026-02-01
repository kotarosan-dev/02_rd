# Pineconeに求人データを登録するスクリプト
# PowerShellで実行: .\register_jobs.ps1

$API_URL = "https://ai-matching-poc-90002038385.development.catalystserverless.jp/server/ai_matching/upsert"

# 1. シニアバックエンドエンジニア
$job1 = @{
    record_id = "13059000001662474"
    record = @{
        title = "シニアバックエンドエンジニア"
        required_skills = "Python, AWS, Kubernetes, Go"
        position = "バックエンドエンジニア"
        location = "東京（リモート可）"
        salary_min = 600
        salary_max = 900
        description = "自社SaaSプロダクトのバックエンド開発をリード"
    }
    record_type = "job"
} | ConvertTo-Json -Depth 3

Write-Host "Registering: シニアバックエンドエンジニア..."
$response1 = Invoke-RestMethod -Uri $API_URL -Method POST -Body $job1 -ContentType "application/json"
Write-Host "Response: $($response1 | ConvertTo-Json)"

# 2. フロントエンドエンジニア
$job2 = @{
    record_id = "13059000001662475"
    record = @{
        title = "フロントエンドエンジニア"
        required_skills = "React, TypeScript, Next.js"
        position = "フロントエンドエンジニア"
        location = "東京"
        salary_min = 400
        salary_max = 600
        description = "新規プロダクトのフロントエンド開発を担当"
    }
    record_type = "job"
} | ConvertTo-Json -Depth 3

Write-Host "Registering: フロントエンドエンジニア..."
$response2 = Invoke-RestMethod -Uri $API_URL -Method POST -Body $job2 -ContentType "application/json"
Write-Host "Response: $($response2 | ConvertTo-Json)"

# 3. テックリード
$job3 = @{
    record_id = "13059000001662476"
    record = @{
        title = "テックリード"
        required_skills = "Java, Spring Boot, MySQL, AWS, チームマネジメント"
        position = "テックリード"
        location = "大阪（リモート可）"
        salary_min = 700
        salary_max = 1000
        description = "開発チームのリーダーとして技術選定・設計・メンバー育成を担当"
    }
    record_type = "job"
} | ConvertTo-Json -Depth 3

Write-Host "Registering: テックリード..."
$response3 = Invoke-RestMethod -Uri $API_URL -Method POST -Body $job3 -ContentType "application/json"
Write-Host "Response: $($response3 | ConvertTo-Json)"

Write-Host ""
Write-Host "=== 登録完了 ==="
Write-Host "登録した求人:"
Write-Host "  - 13059000001662474: シニアバックエンドエンジニア"
Write-Host "  - 13059000001662475: フロントエンドエンジニア"
Write-Host "  - 13059000001662476: テックリード"
