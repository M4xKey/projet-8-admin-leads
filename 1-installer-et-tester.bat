@echo off
rem Etape 1 : installe les dependances puis lance les tests du client API.
cd /d "%~dp0"
echo === Installation des dependances ===
call npm install
if errorlevel 1 goto erreur
echo.
echo === Tests du client API (12 attendus) ===
call npm test
if errorlevel 1 goto erreur
echo.
echo === Verification des types TypeScript ===
call npm run type-check
if errorlevel 1 goto erreur
echo.
echo === Build de production ===
call npm run build
if errorlevel 1 goto erreur
echo.
echo === OK ! Lance 2-demarrer.bat (avec le backend demarre a cote) ===
pause
exit /b 0
:erreur
echo.
echo === ECHEC : copie tout ce qui est affiche ci-dessus dans la session Claude ===
pause
exit /b 1
