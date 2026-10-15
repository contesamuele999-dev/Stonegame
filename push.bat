@echo off
cd /d "%~dp0"
set CHANGED=
for /f %%i in ('git status --porcelain') do set CHANGED=1
rem nuova versione: tutti i telefoni si aggiornano da soli
if defined CHANGED (where node >nul 2>&1 && node tools\nuova-versione.js)
git add -A
git diff --cached --quiet || git commit -m "aggiornamento %date% %time%"
git pull --rebase || (echo Pull fallito, risolvi i conflitti. & pause & exit /b 1)
git push || (echo Push fallito. & pause & exit /b 1)
echo Fatto.
pause
