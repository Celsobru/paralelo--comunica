@echo off
echo =========================================
echo  Enviando atualizacoes para o Servidor...
echo =========================================
git add .
git commit -m "Atualizacao de codigo"
git push origin main
echo.
echo =========================================
echo  Atualizacao enviada com sucesso!
echo =========================================
pause
