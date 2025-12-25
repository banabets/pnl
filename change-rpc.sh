#!/bin/bash

# Script para cambiar el RPC de Solana fácilmente

echo "🔌 Cambiar RPC de Solana"
echo "========================"
echo ""
echo "Opciones disponibles:"
echo ""
echo "1. Ankr (Recomendado - Sin registro)"
echo "   URL: https://rpc.ankr.com/solana"
echo ""
echo "2. Helius (Mejor rate limit - Requiere API key)"
echo "   URL: https://mainnet.helius-rpc.com/?api-key=TU_KEY"
echo "   Registro: https://helius.dev"
echo ""
echo "3. QuickNode (Requiere cuenta)"
echo "   URL: https://TU_ENDPOINT.solana-mainnet.quiknode.pro/TU_KEY"
echo "   Registro: https://quicknode.com"
echo ""
echo "4. Solana Foundation (No recomendado - Rate limit muy bajo)"
echo "   URL: https://api.mainnet-beta.solana.com"
echo ""
echo "5. Personalizado (Ingresa tu propia URL)"
echo ""

read -p "Selecciona una opción (1-5): " option

case $option in
  1)
    RPC_URL="https://rpc.ankr.com/solana"
    ;;
  2)
    read -p "Ingresa tu API key de Helius: " api_key
    RPC_URL="https://mainnet.helius-rpc.com/?api-key=$api_key"
    ;;
  3)
    read -p "Ingresa tu endpoint de QuickNode: " endpoint
    RPC_URL="$endpoint"
    ;;
  4)
    RPC_URL="https://api.mainnet-beta.solana.com"
    ;;
  5)
    read -p "Ingresa la URL del RPC: " RPC_URL
    ;;
  *)
    echo "Opción inválida"
    exit 1
    ;;
esac

# Actualizar .env
if [ -f .env ]; then
  # Remover línea RPC_URL existente si existe
  sed -i.bak '/^RPC_URL=/d' .env
fi

# Agregar nueva línea RPC_URL
echo "RPC_URL=$RPC_URL" >> .env

echo ""
echo "✅ RPC actualizado a: $RPC_URL"
echo ""
echo "⚠️  IMPORTANTE: Reinicia el servidor para aplicar los cambios:"
echo "   pkill -f 'start-web' && node start-web.js"
echo ""




