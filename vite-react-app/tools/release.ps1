# ==============================================================================
#  tools/release.ps1  --  WebViewer Release Notes Updater & Version Bump
#  Run this before committing + pushing a new release build.
#
#  What it does:
#    1. Detects current version from changelog.md or package.json
#    2. Prompts you for version number + title + release notes
#    3. Inserts the dated entry into tools/changelog.md (latest first)
#    4. Synchronizes version number in package.json
# ==============================================================================

$ErrorActionPreference = "Stop"

$RepoRoot      = Split-Path -Parent $PSScriptRoot
$PackageFile   = Join-Path $RepoRoot "package.json"
$ChangelogFile = Join-Path $RepoRoot "tools\changelog.md"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  WEBVIEWER UI BUILDER -- Release Updater   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# -- Detect current version from changelog.md or package.json ----------
$currentVersion = "0.0.0"

if (Test-Path $PackageFile) {
    try {
        $pkgJson = Get-Content $PackageFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($pkgJson.version) {
            $currentVersion = $pkgJson.version
        }
    } catch {}
}

if (Test-Path $ChangelogFile) {
    $cl = Get-Content $ChangelogFile -Raw -Encoding UTF8
    $verMatches = [regex]::Matches($cl, '(?m)^##\s+v?([\d\.]+)')
    if ($verMatches.Count -gt 0) {
        $versions = @($verMatches | ForEach-Object { 
            try { [version]$_.Groups[1].Value } catch { $null }
        } | Where-Object { $_ -ne $null })
        if ($versions.Count -gt 0) {
            $maxVer = ($versions | Sort-Object)[-1]
            $currentVersion = $maxVer.ToString()
        }
    }
}

Write-Host ""
Write-Host "  Current version: $currentVersion" -ForegroundColor Yellow
Write-Host ""

# --------------------------------------------------------------------------
# 1. Collect inputs
# --------------------------------------------------------------------------
$version = (Read-Host "  New version number (e.g. 0.1.1)").Trim()
if ($version -eq "") {
    Write-Host "  No version entered -- aborting." -ForegroundColor Yellow
    exit 0
}
# Strip leading 'v' if typed
if ($version.StartsWith("v")) {
    $version = $version.Substring(1)
}

$title = (Read-Host "  Release title      (e.g. Bug Fixes and UI Polish)").Trim()
if ($title -eq "") {
    $title = "Maintenance Release"
}

Write-Host ""
Write-Host "  Enter changelog lines. Press ENTER on a blank line when done." -ForegroundColor DarkGray
$noteLines = [System.Collections.Generic.List[string]]::new()
while ($true) {
    $line = Read-Host "  >"
    if ($line.Trim() -eq "") { break }
    $noteLines.Add($line.Trim())
}

if ($noteLines.Count -eq 0) {
    Write-Host ""
    Write-Host "  No notes entered -- aborting." -ForegroundColor Yellow
    exit 0
}

# --------------------------------------------------------------------------
# 2. Insert new entry into changelog.md
# --------------------------------------------------------------------------
$date  = Get-Date -Format "yyyy-MM-dd"
$entry = "## v$version - $title ($date)`n`n"
foreach ($note in $noteLines) { 
    $entry += "- $note`n" 
}

$raw = ""
if (Test-Path $ChangelogFile) {
    $raw = Get-Content $ChangelogFile -Raw -Encoding UTF8
}

if ($raw -match '(?m)^##\s+v?') {
    $firstHeaderIndex = [regex]::Match($raw, '(?m)^##\s+v?').Index
    $newContent = $raw.Substring(0, $firstHeaderIndex) + $entry + "`n" + $raw.Substring($firstHeaderIndex)
} elseif ($raw -match '(?m)^#\s+Changelog') {
    # Place right below the header line and description
    $headerMatch = [regex]::Match($raw, '(?m)^#\s+Changelog[^\r\n]*\r?\n(\r?\n[^\r\n]*\r?\n)?')
    if ($headerMatch.Success) {
        $insertIdx = $headerMatch.Index + $headerMatch.Length
        $newContent = $raw.Substring(0, $insertIdx) + "`n" + $entry + "`n" + $raw.Substring($insertIdx)
    } else {
        $newContent = "# Changelog`n`n" + $entry + "`n" + $raw
    }
} else {
    $newContent = "# Changelog`n`n" + $entry + "`n" + $raw
}

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($ChangelogFile, ($newContent.TrimEnd() + "`n"), $utf8NoBom)
Write-Host ""
Write-Host "  tools/changelog.md updated successfully." -ForegroundColor Green

# --------------------------------------------------------------------------
# 3. Synchronize version in package.json (without UTF-8 BOM)
# --------------------------------------------------------------------------
if (Test-Path $PackageFile) {
    $pkgContent = Get-Content $PackageFile -Raw -Encoding UTF8
    $updatedPkg = [regex]::Replace($pkgContent, '("version"\s*:\s*")[^"]+(")', "`${1}$version`${2}")
    [System.IO.File]::WriteAllText($PackageFile, ($updatedPkg.Trim() + "`n"), $utf8NoBom)
    Write-Host "  package.json version bumped to $version." -ForegroundColor Green
}

Write-Host ""
Write-Host "  Release v$version is ready! Stage, commit, and push when ready." -ForegroundColor Cyan
Write-Host ""
