# 🔌 Guía de RPC para Solana

## 🎯 Problema: Rate Limiting

El RPC público de Solana Foundation (`https://api.mainnet-beta.solana.com`) tiene límites muy estrictos que causan errores **429 Too Many Requests** al buscar tokens.

## ✅ Soluciones: RPCs Gratuitos Recomendados

### 1. **Ankr RPC** (⭐ RECOMENDADO - Sin registro)
```
https://rpc.ankr.com/solana
```
- ✅ **Gratis** sin registro
- ✅ Mejor rate limit que Solana Foundation
- ✅ Confiable y rápido
- ✅ Sin API key necesaria

### 2. **Helius** (Mejor opción con registro)
```
https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```
- ✅ **Gratis** con registro (100,000 requests/día)
- ✅ Excelente rate limit
- ✅ Muy confiable
- 📝 Requiere crear cuenta en https://helius.dev

### 3. **QuickNode** (Otra opción con registro)
```
https://YOUR_ENDPOINT.solana-mainnet.quiknode.pro/YOUR_KEY
```
- ✅ **Gratis** con registro
- ✅ Buen rate limit
- 📝 Requiere crear cuenta en https://quicknode.com

### 4. **Solana Foundation** (No recomendado)
```
https://api.mainnet-beta.solana.com
```
- ❌ Rate limit muy bajo
- ❌ Causa errores 429 frecuentemente
- ⚠️ Solo para pruebas básicas

## 🚀 Cómo Configurar

### Opción 1: Usar Ankr (Sin registro - Recomendado)

1. Crear archivo `.env` en la raíz del proyecto:
```bash
RPC_URL=https://rpc.ankr.com/solana
```

2. Reiniciar el servidor:
```bash
pkill -f "start-web"
node start-web.js
```

### Opción 2: Usar Helius (Con registro - Mejor opción)

1. Crear cuenta en https://helius.dev
2. Obtener tu API key gratuita
3. Configurar en `.env`:
```bash
RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY
```

4. Reiniciar el servidor

### Opción 3: Usar QuickNode (Con registro)

1. Crear cuenta en https://quicknode.com
2. Crear un endpoint gratuito
3. Configurar en `.env`:
```bash
RPC_URL=https://TU_ENDPOINT.solana-mainnet.quiknode.pro/TU_KEY
```

4. Reiniciar el servidor

## 📊 Comparación de RPCs

| RPC | Rate Limit | Registro | Recomendado Para |
|-----|------------|----------|------------------|
| Ankr | Medio | ❌ No | Uso general |
| Helius | Alto | ✅ Sí | Producción |
| QuickNode | Alto | ✅ Sí | Producción |
| Solana Foundation | Muy Bajo | ❌ No | Solo pruebas |

## 🔧 Verificar RPC Actual

El RPC actual se muestra en:
- Dashboard → Config
- O en los logs del servidor al iniciar

## 💡 Recomendación Final

**Para empezar rápido:** Usa **Ankr** (sin registro)
```bash
RPC_URL=https://rpc.ankr.com/solana
```

**Para mejor rendimiento:** Usa **Helius** (con registro gratis)
```bash
RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_KEY
```

## ⚠️ Nota Importante

Después de cambiar el RPC, **siempre reinicia el servidor** para que los cambios surtan efecto.





