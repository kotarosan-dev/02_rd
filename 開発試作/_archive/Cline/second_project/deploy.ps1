$env:NEXT_PUBLIC_APP_URL="https://biyoshitsu-app-1070916839862.asia-northeast1.run.app"
$env:NEXT_PUBLIC_SUPABASE_URL="https://upegeprmcxapdsvqtzey.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZWdlcHJtY3hhcGRzdnF0emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MjcxMzYsImV4cCI6MjA0OTUwMzEzNn0.6ZuN5KsupNWy4i5DbhIlUMgR3_V4dDR22R2DyvJn5Vw"

gcloud run deploy biyoshitsu-app `
  --source . `
  --region asia-northeast1 `
  --platform managed `
  --allow-unauthenticated `
  --min-instances 1 `
  --max-instances 10 `
  --memory 1Gi `
  --cpu 1 `
  --port 3000 `
  --timeout 300 `
  --concurrency 80 `
  --set-env-vars "^NODE_ENV=production,NEXT_PUBLIC_APP_URL=$env:NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_SUPABASE_URL=$env:NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$env:NEXT_PUBLIC_SUPABASE_ANON_KEY" `
  --ingress all `
  --session-affinity 