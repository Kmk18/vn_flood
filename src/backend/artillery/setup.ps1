# ============================================================
# BƯỚC 1: Tạo tài khoản test và lấy token
# Chạy script này MỘT LẦN trước khi chạy load test
# ============================================================

$BASE = "https://vnflood-backend-lkpg4zh6za-as.a.run.app"
$EMAIL = "loadtest_$(Get-Random)@test.com"
$PASS  = "LoadTest@123"

Write-Host "=== Đăng ký tài khoản test ===" -ForegroundColor Cyan
$reg = Invoke-RestMethod -Uri "$BASE/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{ email = $EMAIL; password = $PASS; name = "Load Tester" } | ConvertTo-Json)

$TOKEN = $reg.accessToken
Write-Host "Email   : $EMAIL"
Write-Host "Token   : $TOKEN"

# Lưu vào file .env.artillery để Artillery đọc
"TEST_TOKEN=$TOKEN"   | Out-File -FilePath "$PSScriptRoot\.env.artillery" -Encoding utf8
"TEST_EMAIL=$EMAIL"   | Add-Content -Path "$PSScriptRoot\.env.artillery"
"TEST_PASS=$PASS"     | Add-Content -Path "$PSScriptRoot\.env.artillery"

Write-Host "`n=== Token đã lưu vào artillery/.env.artillery ===" -ForegroundColor Green
Write-Host "QUAN TRỌNG: Token hết hạn sau 15 phút — chạy test ngay bây giờ!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Load + stress test:" -ForegroundColor Cyan
Write-Host "  artillery run --dotenv artillery\.env.artillery artillery\load-test.yml --output artillery\load-test-report.json"
Write-Host ""
Write-Host "Chat test (chạy riêng):" -ForegroundColor Cyan
Write-Host "  artillery run artillery\chat-test.yml"
