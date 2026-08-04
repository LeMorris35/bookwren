# ChapterClock one-shot Vercel deploy.
# Prereq: run `vercel login` once first. Then: powershell -File scripts/deploy.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# 0. Sanity: are we logged in?
vercel whoami | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged into Vercel yet. Run: vercel login" -ForegroundColor Yellow
  exit 1
}

# 1. Link (creates the Vercel project on first run; no-op afterwards)
vercel link --yes

# 2. Environment variables — read from local env files, never printed.
function Get-EnvValue([string]$file, [string]$key) {
  $line = Get-Content $file | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { throw "Missing $key in $file" }
  return $line.Substring($key.Length + 1).Trim('"')
}

function Set-VercelEnv([string]$name, [string]$value) {
  # Write the value to a temp file and feed it via cmd's raw redirect.
  # (Piping in PowerShell appends \r\n and the CLI only strips the \n,
  # leaving an invisible \r that corrupts the value — learned the hard way.)
  $tmp = Join-Path $env:TEMP "vercel-env-val.txt"
  [IO.File]::WriteAllText($tmp, $value, [Text.Encoding]::ASCII)
  cmd /c "vercel env add $name production --force < `"$tmp`"" | Out-Null
  Remove-Item $tmp
  Write-Host "  set $name" -ForegroundColor Green
}

Write-Host "Uploading environment variables..."
Set-VercelEnv "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" (Get-EnvValue ".env.local" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
Set-VercelEnv "CLERK_SECRET_KEY" (Get-EnvValue ".env.local" "CLERK_SECRET_KEY")
# Production DB comes from .env.production (dev DB in .env stays local-only)
Set-VercelEnv "DATABASE_URL" (Get-EnvValue ".env.production" "DATABASE_URL")

# 3. Ship it
Write-Host "Deploying to production..."
vercel --prod
