# ShuleCloud Driver — one-shot setup & build (Windows PowerShell)
# Run this from the driver-app folder AFTER Flutter is installed and on PATH.
#
#   cd d:\shulecloud-connect-37\driver-app
#   .\setup_and_build.ps1
#
# What it does:
#   1. Verifies Flutter is available and runs `flutter doctor`.
#   2. Regenerates the native Android/iOS scaffolding that isn't committed
#      (MainActivity, Gradle files, launcher icons) WITHOUT touching lib/.
#   3. Restores the custom AndroidManifest (permissions + Maps key + bg service).
#   4. Fetches packages and builds a release APK.

$ErrorActionPreference = 'Stop'

Write-Host "==> Checking Flutter..." -ForegroundColor Cyan
if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Host "Flutter is not on PATH. Install it first:" -ForegroundColor Red
    Write-Host "  winget install --id Google.Flutter -e" -ForegroundColor Yellow
    Write-Host "  (then close & reopen this terminal)" -ForegroundColor Yellow
    exit 1
}
flutter --version

Write-Host "`n==> Running flutter doctor (fix anything marked with an X)..." -ForegroundColor Cyan
flutter doctor

# Back up the custom manifest — flutter create won't overwrite it, but this is
# a safety net in case you ever run `flutter create` with --overwrite.
$manifest = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifest) {
    Copy-Item $manifest "$manifest.custom" -Force
    Write-Host "`n==> Backed up custom AndroidManifest to $manifest.custom" -ForegroundColor Green
}

Write-Host "`n==> Generating missing native scaffolding (android/ ios/)..." -ForegroundColor Cyan
# Fills in only what's missing; does not touch lib/ or pubspec.yaml.
flutter create --platforms=android,ios --org com.shulecloud .

# Restore our custom manifest (flutter create may have replaced it with a bare one).
if (Test-Path "$manifest.custom") {
    Copy-Item "$manifest.custom" $manifest -Force
    Write-Host "==> Restored custom AndroidManifest (permissions + Maps + bg service)." -ForegroundColor Green
}

Write-Host "`n==> Fetching packages..." -ForegroundColor Cyan
flutter pub get

Write-Host "`n==> Building release APK..." -ForegroundColor Cyan
flutter build apk --release

$apk = "build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apk) {
    Write-Host "`nBUILD OK -> $apk" -ForegroundColor Green
    Write-Host "Install on a connected phone with:" -ForegroundColor Yellow
    Write-Host "  flutter install" -ForegroundColor Yellow
    Write-Host "or copy the APK above to your phone and open it." -ForegroundColor Yellow
} else {
    Write-Host "`nBuild did not produce an APK. Scroll up for the error." -ForegroundColor Red
}
