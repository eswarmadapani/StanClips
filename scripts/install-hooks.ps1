# Install pre-commit hook on Windows (PowerShell)
$hookDir = ".git/hooks"
if (-not (Test-Path $hookDir)) {
    New-Item -ItemType Directory -Path $hookDir -Force | Out-Null
}

$hookContent = @"
#!/bin/sh
python scripts/pre-commit-secrets-check.py
"@

Set-Content -Path "$hookDir/pre-commit" -Value $hookContent -NoNewline
Write-Host "Pre-commit security hook installed successfully."
