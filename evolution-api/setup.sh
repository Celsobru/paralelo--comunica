#!/bin/bash
# Evolution API - Setup rapido
# Requer: Docker + Docker Compose

echo "=== Instalando Evolution API ==="

# 1. Verifica Docker
if ! command -v docker &> /dev/null; then
    echo "ERRO: Docker nao instalado."
    echo "Instale: curl -fsSL https://get.docker.com | bash"
    exit 1
fi

# 2. Cria diretorio de dados
mkdir -p evolution_data

# 3. Sobe o container
docker compose up -d

echo ""
echo "=== PRONTO! ==="
echo ""
echo "Acesse o painel da Evolution API:"
echo "  http://SEU_IP:8080/manager"
echo ""
echo "Configuracao no seu RSS Monitor:"
echo "  URL:     http://SEU_IP:8080/message/sendText/MEU_INSTANCE"
echo "  API Key: paralelo2026"
echo "  Instance: MEU_INSTANCE (escolha um nome)"
echo "  Telefone: 5511999999999"
echo ""
echo "PASSO A PASSO:"
echo "  1. Abra http://SEU_IP:8080/manager"
echo "  2. Crie uma instancia com o nome que escolheu"
echo "  3. Escaneie o QR Code com o WhatsApp"
echo "  4. Cole os dados no painel admin do seu site"
echo ""
