param()

$ErrorActionPreference = 'Stop'

function Show-ToolVersion {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command
    )

    $resolved = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $resolved) {
        Write-Warning "$Name not found on PATH"
        return
    }

    try {
        $version = & $resolved.Source --version 2>&1 | Select-Object -First 1
        Write-Host "$Name : $version"
    }
    catch {
        Write-Warning "$Name was found but could not report its version"
    }
}

Write-Host 'Remote Chrome YouTube Controller development checks'
Show-ToolVersion -Name 'Node.js' -Command 'node'
Show-ToolVersion -Name 'pnpm' -Command 'pnpm'
Show-ToolVersion -Name '.NET' -Command 'dotnet'

Write-Host ''
Write-Host 'Start the services in separate terminals:'
Write-Host '  dotnet run --project src/RemoteChromeYouTubeController.Server'
Write-Host '  pnpm dev:web'
Write-Host '  pnpm dev:extension'
Write-Host ''
Write-Host 'Then load artifacts/chrome-extension in chrome://extensions'
