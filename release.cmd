@echo off
if exist "%~dp0tools\release.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\release.ps1" %*
) else (
    echo tools\release.ps1 not found.
)
