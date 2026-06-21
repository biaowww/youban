<#
  git-save.ps1 - one-shot commit (optional merge), auto-clears stale git locks.
  Assumes single-user; no other git process running.
  Kept ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 as the system
  ANSI codepage (e.g. GBK), so non-ASCII text in the file breaks parsing.

  Usage (run from anywhere inside the repo):
    powershell -ExecutionPolicy Bypass -File src\scripts\git-save.ps1 -m "your message"
    powershell -ExecutionPolicy Bypass -File src\scripts\git-save.ps1 -m "your message" -MergeInto electron

  The -m message may contain Chinese (passed as an argument, not parsed from the file).
  Paste the output back to Claude if anything fails.
#>
param(
  [Parameter(Mandatory = $true)][string]$m,
  [string]$MergeInto
)
$ErrorActionPreference = 'Stop'

# Let git locate the repo root (robust; no dependence on script path)
$repo = (git rev-parse --show-toplevel 2>$null)
if (-not $repo) {
  Write-Host "Not inside a git repo. Run from the repository directory." -ForegroundColor Red
  exit 1
}
$repo = $repo.Trim()
Set-Location $repo
Write-Host "Repo: $repo" -ForegroundColor Cyan

# Clear stale locks (safe only when no other git process is running)
foreach ($lock in @('.git/index.lock', '.git/HEAD.lock')) {
  if (Test-Path $lock) {
    Remove-Item $lock -Force
    Write-Host "Cleared stale lock: $lock" -ForegroundColor Yellow
  }
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Branch: $branch" -ForegroundColor Cyan

# Commit (skip if nothing to commit)
if (git status --porcelain) {
  git add -A
  git commit -m $m
  Write-Host "Committed." -ForegroundColor Green
}
else {
  Write-Host "Nothing to commit; skipping." -ForegroundColor DarkGray
}

# Optional: merge current branch into target
if ($MergeInto -and ($MergeInto -ne $branch)) {
  git checkout $MergeInto
  git merge --no-edit $branch
  Write-Host "Merged $branch into $MergeInto." -ForegroundColor Green
}

Write-Host ""
Write-Host "Recent commits:" -ForegroundColor Cyan
git --no-pager log --oneline -6
