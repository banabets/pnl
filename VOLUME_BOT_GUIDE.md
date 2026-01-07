# 🤖 Volume Bot - Guía de Uso

## 📋 Descripción

El **Volume Bot** es un sistema automatizado que genera volumen de trading en pump.fun. Con **1 SOL** puede generar más de **$25,000 USD** en volumen total (compras + ventas) mediante estrategias optimizadas de compra/venta rápida.

## 🎯 Características

- ✅ **Cálculo automático de estrategia** para maximizar volumen con mínimo capital
- ✅ **Compras y ventas rápidas** que reutilizan el mismo SOL múltiples veces
- ✅ **Soporte para múltiples wallets** para parecer más orgánico
- ✅ **Integración con sistema de wallets** existente (wallet-service o keypairs)
- ✅ **Validación de wallets** antes de ejecutar trades
- ✅ **Trades reales** en pump.fun (no simulación)

## 🚀 Uso

### Endpoint API

**POST** `/api/volume-bot/execute`

### Parámetros

```json
{
  "tokenMint": "TokenMintAddress...",        // Requerido: Dirección del token en pump.fun
  "tokenName": "Token Name",                  // Opcional: Nombre del token
  "totalSolAmount": 1,                        // Opcional: Total SOL disponible (default: 1)
  "targetVolumeUSD": 25000,                   // Opcional: Volumen objetivo en USD (default: 25000)
  "maxTransactions": 100,                    // Opcional: Máximo número de transacciones
  "minTransactionSize": 0.01,                 // Opcional: Tamaño mínimo por transacción en SOL
  "maxTransactionSize": 0.1,                  // Opcional: Tamaño máximo por transacción en SOL
  "delayBetweenTrades": 1000,                // Opcional: Delay entre trades en ms (default: 1000)
  "useMultipleWallets": true,                 // Opcional: Usar múltiples wallets (default: true)
  "slippageBps": 100,                        // Opcional: Slippage en basis points (default: 100 = 1%)
  "walletIndices": [1, 2, 3]                 // Opcional: Índices específicos de wallets a usar
}
```

### Ejemplo de Request

```bash
curl -X POST https://pnl.onl/api/volume-bot/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenMint": "TokenMintAddress...",
    "totalSolAmount": 1,
    "targetVolumeUSD": 25000,
    "useMultipleWallets": true,
    "delayBetweenTrades": 1000
  }'
```

### Respuesta

```json
{
  "success": true,
  "result": {
    "success": true,
    "totalVolumeUSD": 25150.50,
    "totalTransactions": 85,
    "buyTransactions": 43,
    "sellTransactions": 42,
    "totalSolUsed": 0.95,
    "transactions": [
      {
        "type": "buy",
        "signature": "transaction_signature...",
        "solAmount": 0.05,
        "volumeUSD": 7.50,
        "timestamp": 1234567890
      },
      // ... más transacciones
    ],
    "strategy": {
      "transactionsPerWallet": 28,
      "solPerTransaction": 0.035,
      "estimatedVolumeUSD": 25150.50,
      "totalTransactions": 85,
      "strategy": "rapid"
    },
    "errors": []
  }
}
```

## 📊 Cómo Funciona

### Estrategia de Volumen

El bot calcula automáticamente la estrategia óptima:

1. **Cálculo de volumen necesario**: 
   - Volumen objetivo: $25,000 USD
   - Con 1 SOL (~$150 USD), necesitamos generar ~166x el capital inicial
   
2. **Estrategia de reutilización**:
   - Cada ciclo de compra/venta genera volumen de: compra + venta = 2x el valor
   - Ejemplo: Comprar con 0.05 SOL, vender = 0.05 SOL recuperado + volumen de 0.1 SOL
   - Con 1 SOL podemos hacer ~20 ciclos completos
   - Volumen generado: 20 ciclos × 0.1 SOL × $150 × 2 = $6,000
   - Para llegar a $25,000 necesitamos más transacciones o transacciones más grandes

3. **Optimización**:
   - El bot calcula el tamaño óptimo de transacción
   - Distribuye transacciones entre múltiples wallets
   - Ajusta frecuencia y tamaño según el objetivo

### Tipos de Estrategia

- **Rapid**: Muchas transacciones pequeñas rápidas (>100 transacciones)
- **Distributed**: Usa múltiples wallets con transacciones medianas (5+ wallets)
- **Mixed**: Combinación de ambas estrategias

## ⚙️ Configuración

### Wallets

El bot puede usar wallets de dos fuentes:

1. **Wallet Service** (si MongoDB está conectado):
   - Usa wallets del usuario autenticado
   - Se accede mediante `walletService.getUserWallets()`

2. **Keypairs Directory** (fallback):
   - Carga wallets desde el directorio `keypairs/`
   - Archivos: `keypair_1.json`, `keypair_2.json`, etc.

### Requisitos de Wallets

- Cada wallet debe tener suficiente balance:
  - `solPerWallet + 0.001 SOL` (para fees)
  - Ejemplo: Si `totalSolAmount = 1` y `useMultipleWallets = true` con 10 wallets:
    - Cada wallet necesita: `1 / 10 + 0.001 = 0.101 SOL`

## 🛑 Detener el Bot

**POST** `/api/volume-bot/stop`

```bash
curl -X POST https://pnl.onl/api/volume-bot/stop
```

## ⚠️ Advertencias

1. **Trades Reales**: Todos los trades son REALES y usan fondos reales
2. **Pérdidas Potenciales**: El bot puede tener pérdidas por slippage, fees, y cambios de precio
3. **Validación de Wallets**: Asegúrate de que tus wallets tengan suficiente balance
4. **Rate Limiting**: Respeta los límites de la red Solana y pump.fun
5. **Slippage**: Configura slippage apropiado según la liquidez del token

## 📈 Ejemplo de Cálculo

### Escenario: 1 SOL → $25,000 USD de Volumen

**Configuración:**
- `totalSolAmount`: 1 SOL
- `targetVolumeUSD`: 25,000 USD
- `useMultipleWallets`: true (10 wallets)
- Precio SOL: $150 USD

**Cálculo del bot:**
- SOL por wallet: 1 / 10 = 0.1 SOL
- Transacciones necesarias: ~85
- SOL por transacción: ~0.035 SOL
- Volumen por transacción: 0.035 × 2 × $150 = $10.50
- Volumen total: 85 × $10.50 = $8,925

**Nota**: Para alcanzar $25,000, el bot ajustará automáticamente:
- Más transacciones
- Transacciones más grandes
- Más ciclos de compra/venta

## 🔧 Troubleshooting

### Error: "No wallets available"

**Solución:**
- Verifica que tengas wallets configurados en `keypairs/` o en wallet-service
- Asegúrate de que los wallets tengan suficiente balance

### Error: "Insufficient balance"

**Solución:**
- Verifica que cada wallet tenga: `(totalSolAmount / numWallets) + 0.001 SOL`
- Distribuye más SOL a los wallets o reduce `totalSolAmount`

### Error: "Buy failed" o "Sell failed"

**Solución:**
- Verifica que el token existe en pump.fun
- Verifica que el token tenga suficiente liquidez
- Aumenta `slippageBps` si hay problemas de slippage
- Verifica que el RPC esté funcionando correctamente

### Volumen menor al esperado

**Solución:**
- Aumenta `maxTransactions`
- Aumenta `maxTransactionSize`
- Reduce `delayBetweenTrades` (con precaución)
- Usa más wallets (`useMultipleWallets: true`)

## 📝 Notas Técnicas

- El bot usa el programa Anchor de pump.fun para ejecutar trades
- Las transacciones se ejecutan secuencialmente con delays configurables
- El bot calcula tokens recibidos y SOL recibido desde las transacciones confirmadas
- El precio de SOL se obtiene de CoinGecko API (fallback: $150)

## 🎯 Mejores Prácticas

1. **Empieza con montos pequeños** para probar el bot
2. **Monitorea las transacciones** en tiempo real
3. **Usa múltiples wallets** para parecer más orgánico
4. **Configura delays apropiados** para evitar rate limiting
5. **Verifica la liquidez del token** antes de ejecutar
6. **Ten suficiente balance** en cada wallet para fees

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa los logs del servidor
2. Verifica que los wallets tengan balance suficiente
3. Verifica que el token exista en pump.fun
4. Revisa la configuración de RPC

