@echo off
echo Démarrage de l'application avec PM2...

:: Vérifier si PM2 est installé
where pm2 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo PM2 n'est pas installé ou n'est pas dans le PATH.
    echo Installation de PM2...
    npm install -g pm2
)

:: Chemin vers le répertoire de l'application
cd /d "C:\Users\VIPNET\Desktop\FDP"

:: Démarrage propre avec PM2
echo Démarrage des services via ecosystem.config.cjs...
pm2 start ecosystem.config.cjs

:: Vérification du démarrage
pm2 list

echo Démarrage terminé. Les services sont en cours d'exécution.