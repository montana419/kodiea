# Configuration
$ApiUrl = "http://localhost:3000/api/triage-file"
$ImagePath = "sample_qr.png" # Make sure a test QR code image exists at this path

# 1. Test UNAUTHORIZED Wallet (Should return 403 Forbidden)
Write-Host "--- Test 1: Testing Unauthorized EMT Wallet ---" -ForegroundColor Yellow
$UnauthorizedWallet = "0x0000000000000000000000000000000000000001"

try {
    $form = @{
        image = Get-Item $ImagePath
        emtAddress = $UnauthorizedWallet
    }
    $response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Form $form
    Write-Host "Unexpected Success:" ($response | ConvertTo-Json) -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    
    Write-Host "HTTP Status: $statusCode" -ForegroundColor Green
    Write-Host "Response: $responseBody" -ForegroundColor Cyan
}

Write-Host "`n------------------------------------------------`n"

# 2. Test AUTHORIZED Wallet (Should pass Sepolia check)
Write-Host "--- Test 2: Testing Authorized EMT Wallet ---" -ForegroundColor Yellow
# Replace this with an address that IS authorized in your EmtRegistry contract
$AuthorizedWallet = "0xYOUR_AUTHORIZED_EMT_WALLET_ADDRESS" 

try {
    $form = @{
        image = Get-Item $ImagePath
        emtAddress = $AuthorizedWallet
    }
    $response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Form $form
    Write-Host "Success! Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Cyan
} catch {
    Write-Host "Failed with status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}