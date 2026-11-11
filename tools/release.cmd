@echo off
if exist "%~dp0release.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
) else (
    echo release.ps1 not found.
)
