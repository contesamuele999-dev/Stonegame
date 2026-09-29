@echo off
cd /d "%~dp0"
git add -A
git diff --cached --quiet || git commit -m "aggiornamento %date% %time%"
git pull --rebase || (echo Pull fallito, risolvi i conflitti. & pause & exit /b 1)
git push || (echo Push fallito. & pause & exit /b 1)
echo Fatto.
pause
