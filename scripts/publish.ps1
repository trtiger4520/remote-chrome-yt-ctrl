param(
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$publishRoot = Join-Path $root 'artifacts/publish'
$serverOutput = Join-Path $publishRoot 'server'
$extensionOutput = Join-Path $publishRoot 'chrome-extension'

Push-Location $root
try {
    Write-Host 'Building web and extension artifacts'
    pnpm build

    New-Item -ItemType Directory -Force -Path $serverOutput, $extensionOutput | Out-Null

    Write-Host 'Publishing Server for win-x64'
    dotnet publish src/RemoteChromeYouTubeController.Server/RemoteChromeYouTubeController.Server.csproj `
        --configuration $Configuration `
        --runtime win-x64 `
        --self-contained false `
        --output $serverOutput

    $extensionSource = Join-Path $root 'artifacts/chrome-extension'
    Copy-Item -Path (Join-Path $extensionSource '*') -Destination $extensionOutput -Recurse -Force

    $version = [ordered]@{
        product = 'RemoteChromeYouTubeController'
        productVersion = '0.1.0'
        protocolVersion = 1
        configuration = $Configuration
        generatedAtUtc = [DateTime]::UtcNow.ToString('O')
    }
    $version | ConvertTo-Json | Set-Content -Path (Join-Path $publishRoot 'VERSION.json') -Encoding utf8
    Write-Host "Published to $publishRoot"
}
finally {
    Pop-Location
}
