# Pack DDT_ASAR_SOURCE back into ddt-asar/app.asar
$baseDir = Split-Path -Parent $PSScriptRoot
$sourceDir = $PSScriptRoot
$targetAsar = Join-Path $baseDir "ddt-asar\app.asar"

Write-Host "Packing DDT_ASAR_SOURCE into $targetAsar..." -ForegroundColor Cyan
npx asar pack $sourceDir $targetAsar

if (Test-Path $targetAsar) {
    $size = (Get-Item $targetAsar).Length
    Write-Host "Success! app.asar repacked ($size bytes)" -ForegroundColor Green
    Write-Host "Now you can run: python install.py (and choose DDT-Asar) to apply it to Discord!" -ForegroundColor Yellow
} else {
    Write-Error "Failed to pack app.asar!"
}

