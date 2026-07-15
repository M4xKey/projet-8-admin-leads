@echo off
rem Demarre le dashboard en mode dev (http://localhost:5173).
rem Prerequis : le backend leads doit tourner (3-demarrer.bat du projet 7).
cd /d "%~dp0"
call npm run dev
pause
