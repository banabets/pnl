s# 📈 PUMP BOT - Guía de Uso

## 🚀 ¿Qué es el Pump Bot?

El Pump Bot es un sistema avanzado que coordina múltiples wallets para ejecutar compras simultáneas de tokens, diseñado para generar volumen y presión de compra coordinada.

## ✨ Características Principales

### 1. **Swaps Reales con Raydium SDK**
- ✅ Implementación completa de swaps reales (no simulación)
- ✅ Integración con Raydium SDK v1.3.1
- ✅ Fallback automático a Jupiter Aggregator si Raydium falla
- ✅ Manejo robusto de errores y reintentos

### 2. **Sistema de Pump Coordinado**
- ✅ Múltiples wallets comprando simultáneamente
- ✅ Distribución inteligente de montos entre wallets
- ✅ Tres modos de ejecución:
  - **Simultáneo**: Todas las wallets compran al mismo tiempo
  - **Secuencial**: Una wallet después de otra con delay
  - **Bundled**: Agrupado con Jito (en desarrollo)

### 3. **Configuración Flexible**
- ✅ Selección de token por mint address
- ✅ Monto total distribuido automáticamente
- ✅ Control de slippage
- ✅ Número de wallets a usar
- ✅ Delays configurables

## 📋 Cómo Usar el Pump Bot

### Paso 1: Preparar Wallets
```bash
# Generar wallets de trading
npm start
# Seleccionar: "🔑 Generate Trading Wallets"
# Recomendado: 5-10 wallets
```

### Paso 2: Fondear Wallets
```bash
# Opción A: Desde Master Wallet (recomendado)
# 1. Crear Master Wallet
# 2. Fondear Master Wallet manualmente
# 3. Usar "💰 Fund Trading Wallets (from Master)"

# Opción B: Manual
# Fondear cada wallet individualmente
```

### Paso 3: Configurar Pump
```bash
# En el menú principal, seleccionar:
"📈 Start Pump Bot"

# Configurar:
- Token mint address (ej: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263)
- Token name (para display)
- Total SOL a gastar
- Número de wallets
- Modo de ejecución
- Slippage tolerance
```

### Paso 4: Ejecutar
```bash
# El bot:
1. Encuentra el pool de liquidez automáticamente
2. Distribuye el monto entre wallets
3. Ejecuta las compras según el modo seleccionado
4. Muestra resultados detallados
```

## 🎯 Modos de Ejecución

### ⚡ Simultáneo
- **Uso**: Máximo impacto inmediato
- **Cómo funciona**: Todas las wallets compran al mismo tiempo
- **Ventajas**: 
  - Mayor presión de compra instantánea
  - Ejecución más rápida
- **Desventajas**:
  - Puede causar mayor slippage
  - Más detectable

### 🔄 Secuencial
- **Uso**: Apariencia más orgánica
- **Cómo funciona**: Una wallet compra, espera delay, siguiente wallet
- **Ventajas**:
  - Menos slippage acumulado
  - Parece más natural
  - Mejor para tokens con poca liquidez
- **Desventajas**:
  - Toma más tiempo
  - Menos impacto inmediato

### 📦 Bundled (En Desarrollo)
- **Uso**: Ejecución atómica con Jito
- **Cómo funciona**: Todas las transacciones en un bundle
- **Ventajas**:
  - Ejecución garantizada (todo o nada)
  - Protección MEV
  - Más eficiente
- **Estado**: Actualmente cae back a modo simultáneo

## ⚙️ Configuración Recomendada

### Para Tokens con Alta Liquidez
```
- Modo: Simultáneo
- Slippage: 1-3%
- Wallets: 5-10
- Delay: 0ms (simultáneo)
```

### Para Tokens con Baja Liquidez
```
- Modo: Secuencial
- Slippage: 5-10%
- Wallets: 3-5
- Delay: 200-500ms entre wallets
```

### Para Máximo Impacto
```
- Modo: Simultáneo
- Slippage: 5%
- Wallets: 10-20
- Monto total: Distribuido equitativamente
```

## 🔒 Seguridad

### ⚠️ Advertencias Importantes

1. **Modo Simulación**: Siempre prueba primero en modo simulación
2. **Montos Pequeños**: Empieza con montos pequeños para probar
3. **Slippage**: Configura slippage apropiado según liquidez
4. **Pool ID**: El bot intenta encontrar el pool automáticamente, pero puede requerir pool ID manual
5. **Fondos**: Asegúrate de tener suficiente SOL en cada wallet

### ✅ Mejores Prácticas

- ✅ Prueba en devnet primero
- ✅ Usa modo simulación para validar configuración
- ✅ Monitorea las transacciones en Solscan
- ✅ Empieza con 1-2 wallets y montos pequeños
- ✅ Verifica que el token tenga liquidez suficiente
- ✅ Ten un plan de salida (cuándo vender)

## 📊 Resultados del Pump

El bot muestra:
- Total de trades ejecutados
- Trades exitosos vs fallidos
- Volumen total gastado
- Tokens recibidos
- Precio promedio
- Signatures de todas las transacciones
- Errores (si los hay)

## 🐛 Troubleshooting

### Error: "Pool not found"
- **Solución**: Proporciona el pool ID manualmente o verifica que el token tenga pool en Raydium

### Error: "Insufficient balance"
- **Solución**: Asegúrate de tener suficiente SOL en las wallets (incluye fees)

### Error: "Transaction failed"
- **Solución**: 
  - Verifica que el RPC esté funcionando
  - Aumenta el slippage
  - Verifica que el pool tenga liquidez suficiente

### Swaps muy lentos
- **Solución**: 
  - Usa un RPC más rápido (Helius, QuickNode, etc.)
  - Reduce el número de wallets
  - Usa modo simultáneo en lugar de secuencial

## 🚧 Funcionalidades en Desarrollo

- [ ] Bundles de Jito completamente funcionales
- [ ] Detección automática de pool más robusta
- [ ] Soporte para múltiples DEXes (Orca, Jupiter)
- [ ] Estrategias avanzadas (DCA, TWAP)
- [ ] Dashboard en tiempo real
- [ ] Alertas y notificaciones

## 📝 Ejemplo de Uso Completo

```bash
# 1. Iniciar bot
npm start

# 2. Crear master wallet
→ "🏦 Create Master Wallet"
→ Copiar dirección
→ Fondear con 5 SOL desde Phantom/Solflare

# 3. Generar trading wallets
→ "🔑 Generate Trading Wallets"
→ Generar 10 wallets

# 4. Distribuir fondos
→ "💰 Fund Trading Wallets (from Master)"
→ Distribuir 4 SOL (0.4 SOL por wallet)

# 5. Iniciar pump
→ "📈 Start Pump Bot"
→ Token mint: [tu token mint]
→ Token name: MYTOKEN
→ Total amount: 3 SOL
→ Wallets: 10
→ Mode: Simultaneous
→ Slippage: 5%

# 6. Confirmar y ejecutar
→ El bot ejecuta las compras
→ Ver resultados

# 7. Recuperar fondos
→ "🔄 Recover Funds to Master"
→ "💸 Withdraw from Master"
```

## ⚖️ Consideraciones Legales

- ⚠️ Este bot es para uso educativo y de investigación
- ⚠️ Verifica las regulaciones locales sobre trading automatizado
- ⚠️ No uses para manipulación de mercado ilegal
- ⚠️ Sé responsable con tus fondos

---

**¡Disfruta del Pump Bot! 🚀📈**

