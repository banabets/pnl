# 📈 PUMP.FUN BOT - Guía Completa

## 🎯 ¿Qué es el Pump.fun Bot?

El Pump.fun Bot es un sistema especializado para comprar tokens en **pump.fun**, la plataforma de lanzamiento de tokens en Solana. Coordina múltiples wallets para ejecutar compras simultáneas o secuenciales de tokens en pump.fun.

## ✨ Características

### 1. **Integración con Pump.fun**
- ✅ Compra de tokens directamente en pump.fun
- ✅ Uso del programa oficial de pump.fun (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px`)
- ✅ Interacción con bonding curves de pump.fun
- ✅ Obtención automática de información de tokens

### 2. **Sistema de Pump Coordinado**
- ✅ Múltiples wallets comprando simultáneamente
- ✅ Distribución inteligente de montos
- ✅ Tres modos de ejecución:
  - **Simultáneo**: Todas las wallets compran al mismo tiempo
  - **Secuencial**: Una wallet después de otra con delay
  - **Bundled**: Agrupado con Jito (en desarrollo)

### 3. **Configuración Flexible**
- ✅ Token por mint address
- ✅ Monto total distribuido automáticamente
- ✅ Control de slippage
- ✅ Número de wallets configurable
- ✅ Delays configurables

## 📋 Cómo Usar el Pump.fun Bot

### Paso 1: Preparar Wallets
```bash
npm start

# En el menú:
→ "🔑 Generate Trading Wallets"
→ Generar 5-10 wallets (recomendado)
```

### Paso 2: Fondear Wallets
```bash
# Opción A: Desde Master Wallet (recomendado)
→ "🏦 Create Master Wallet"
→ Fondear master wallet manualmente
→ "💰 Fund Trading Wallets (from Master)"

# Opción B: Manual
→ Fondear cada wallet individualmente
```

### Paso 3: Configurar Pump.fun Bot
```bash
# En el menú principal:
→ "📈 Start Pump.fun Bot"

# Configurar:
- Token mint address (ej: token de pump.fun)
- Token name (para display)
- Total SOL a gastar
- Número de wallets
- Modo de ejecución
- Slippage tolerance
```

### Paso 4: Ejecutar
```bash
# El bot:
1. Valida que el token existe en pump.fun
2. Obtiene información del token (nombre, símbolo, market cap)
3. Distribuye el monto entre wallets
4. Ejecuta las compras según el modo seleccionado
5. Muestra resultados detallados con signatures
```

## 🎯 Modos de Ejecución

### ⚡ Simultáneo
**Uso**: Máximo impacto inmediato

**Cómo funciona**: Todas las wallets compran al mismo tiempo

**Ventajas**:
- Mayor presión de compra instantánea
- Ejecución más rápida
- Mejor para tokens con alta liquidez

**Desventajas**:
- Puede causar mayor slippage
- Más detectable

### 🔄 Secuencial
**Uso**: Apariencia más orgánica

**Cómo funciona**: Una wallet compra, espera delay, siguiente wallet

**Ventajas**:
- Menos slippage acumulado
- Parece más natural
- Mejor para tokens con poca liquidez

**Desventajas**:
- Toma más tiempo
- Menos impacto inmediato

### 📦 Bundled (En Desarrollo)
**Uso**: Ejecución atómica con Jito

**Estado**: Actualmente cae back a modo simultáneo

## ⚙️ Configuración Recomendada

### Para Tokens Nuevos (Baja Liquidez)
```
- Modo: Secuencial
- Slippage: 10-15%
- Wallets: 3-5
- Delay: 200-500ms entre wallets
- Monto: 0.1-0.5 SOL por wallet
```

### Para Tokens con Liquidez
```
- Modo: Simultáneo
- Slippage: 5-10%
- Wallets: 5-10
- Delay: 0ms (simultáneo)
- Monto: 0.2-1 SOL por wallet
```

### Para Máximo Impacto
```
- Modo: Simultáneo
- Slippage: 10%
- Wallets: 10-20
- Monto total: 5-10 SOL distribuido
```

## 🔒 Seguridad

### ⚠️ Advertencias Importantes

1. **Modo Simulación**: Siempre prueba primero en modo simulación
2. **Montos Pequeños**: Empieza con montos pequeños (0.1-0.5 SOL)
3. **Slippage**: Configura slippage apropiado (10-15% para pump.fun es normal)
4. **Token Validez**: Verifica que el token existe en pump.fun antes de comprar
5. **Fondos**: Asegúrate de tener suficiente SOL en cada wallet (incluye fees)

### ✅ Mejores Prácticas

- ✅ Prueba en devnet primero (si es posible)
- ✅ Usa modo simulación para validar configuración
- ✅ Monitorea las transacciones en Solscan
- ✅ Empieza con 1-2 wallets y montos pequeños
- ✅ Verifica que el token tenga liquidez suficiente
- ✅ Ten un plan de salida (cuándo vender)

## 📊 Resultados del Pump

El bot muestra:
- Total de trades ejecutados
- Trades exitosos vs fallidos
- Volumen total gastado (SOL)
- Tokens recibidos
- Precio promedio
- Signatures de todas las transacciones
- Errores (si los hay)

## 🐛 Troubleshooting

### Error: "Token not found on pump.fun"
**Solución**: 
- Verifica que el mint address sea correcto
- Asegúrate de que el token esté en pump.fun
- El token debe estar activo (no graduado)

### Error: "Insufficient balance"
**Solución**: 
- Asegúrate de tener suficiente SOL en las wallets
- Incluye fees de transacción (0.000005 SOL por tx)
- Considera dejar 0.01 SOL extra por wallet

### Error: "Transaction failed"
**Solución**: 
- Verifica que el RPC esté funcionando
- Aumenta el slippage
- Verifica que el token tenga liquidez suficiente
- El bonding curve puede estar lleno (token graduado)

### Swaps muy lentos
**Solución**: 
- Usa un RPC más rápido (Helius, QuickNode, etc.)
- Reduce el número de wallets
- Usa modo simultáneo en lugar de secuencial

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

# 5. Iniciar pump.fun bot
→ "📈 Start Pump.fun Bot"
→ Token mint: [mint address del token en pump.fun]
→ Token name: MYTOKEN
→ Total amount: 3 SOL
→ Wallets: 10
→ Mode: Simultaneous
→ Slippage: 10%

# 6. Confirmar y ejecutar
→ El bot ejecuta las compras
→ Ver resultados con signatures

# 7. Verificar en pump.fun
→ Ir a pump.fun
→ Buscar tu token
→ Ver tus compras

# 8. Recuperar fondos (opcional)
→ "🔄 Recover Funds to Master"
→ "💸 Withdraw from Master"
```

## 🔍 Cómo Encontrar Tokens en Pump.fun

1. **Ir a pump.fun**
2. **Buscar tokens** en la página principal
3. **Copiar el mint address** del token que quieres
4. **Pegar en el bot** cuando te pida el token mint

## ⚖️ Consideraciones Legales

- ⚠️ Este bot es para uso educativo y de investigación
- ⚠️ Verifica las regulaciones locales sobre trading automatizado
- ⚠️ No uses para manipulación de mercado ilegal
- ⚠️ Sé responsable con tus fondos
- ⚠️ Pump.fun es de alto riesgo - solo invierte lo que puedes permitirte perder

## 🚧 Funcionalidades en Desarrollo

- [ ] Bundles de Jito completamente funcionales
- [ ] Detección automática de bonding curve más robusta
- [ ] Soporte para venta de tokens
- [ ] Estrategias avanzadas (DCA, TWAP)
- [ ] Dashboard en tiempo real
- [ ] Alertas y notificaciones
- [ ] Integración con API de pump.fun para más información

## 📚 Recursos

- **Pump.fun Website**: https://pump.fun
- **Pump.fun Program ID**: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px`
- **Solana Explorer**: https://solscan.io
- **Pump.fun API**: https://frontend-api.pump.fun

---

**¡Disfruta del Pump.fun Bot! 🚀📈**

*Recuerda: Pump.fun es de alto riesgo. Solo invierte lo que puedes permitirte perder.*

