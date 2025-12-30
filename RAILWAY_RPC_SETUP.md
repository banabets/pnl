# 🔧 Configurar RPC en Railway

## ✅ Backend Funcionando

Tu servidor está corriendo correctamente en Railway:
- **URL**: `https://web-production-a1176.up.railway.app`
- **Puerto**: `8080` (Railway lo configura automáticamente)
- **Estado**: ✅ Funcionando

## ⚠️ Problema: Rate Limits (429 Errors)

Estás recibiendo errores `429 Too Many Requests` porque estás usando el RPC público gratuito de Solana:
- `https://api.mainnet-beta.solana.com` tiene rate limits muy estrictos
- Después de algunas peticiones, bloquea temporalmente

## 🔧 Solución: Usar Helius RPC (Recomendado)

### Opción 1: Helius (Gratis hasta 100k requests/día)

1. **Crear cuenta en Helius**:
   - Ve a [helius.dev](https://helius.dev)
   - Crea una cuenta gratuita
   - Obtén tu API key

2. **Agregar Variable en Railway**:
   - Ve a Railway Dashboard → Tu Servicio → Variables
   - Agrega nueva variable:
     - **Name**: `RPC_URL`
     - **Value**: `https://mainnet.helius-rpc.com/?api-key=TU_API_KEY`
     - Reemplaza `TU_API_KEY` con tu API key de Helius

3. **Redeploy**:
   - Railway detectará el cambio automáticamente
   - O haz redeploy manual

### Opción 2: Otros RPC Providers

#### QuickNode
- URL: `https://TU_ENDPOINT.quiknode.pro/TU_API_KEY`
- Plan gratuito disponible

#### Alchemy
- URL: `https://solana-mainnet.g.alchemy.com/v2/TU_API_KEY`
- Plan gratuito disponible

#### Triton
- URL: `https://YOUR_ENDPOINT.rpcpool.com`
- Plan gratuito disponible

## 📋 Pasos para Configurar Helius

### 1. Obtener API Key de Helius

1. Ve a [helius.dev](https://helius.dev)
2. Click **"Sign Up"** o **"Login"**
3. Ve a **Dashboard**
4. Click **"Create API Key"**
5. Selecciona **"Mainnet"**
6. Copia tu API key

### 2. Configurar en Railway

1. Ve a [railway.app](https://railway.app)
2. Selecciona tu proyecto
3. Click en el servicio `web-production`
4. Ve a **Variables** (en el menú lateral)
5. Click **"New Variable"**
6. Agrega:
   - **Name**: `RPC_URL`
   - **Value**: `https://mainnet.helius-rpc.com/?api-key=TU_API_KEY`
   - Reemplaza `TU_API_KEY` con tu API key real
7. Click **"Add"**

### 3. Redeploy

Railway detectará el cambio y redeployará automáticamente. O haz redeploy manual:
- Ve a **Deployments**
- Click en los **3 puntos** (⋯) del último deployment
- Click **"Redeploy"**

### 4. Verificar

Después del redeploy, revisa los logs:
- Deberías ver: `🔗 Using RPC: https://mainnet.helius-rpc.com/...`
- NO deberías ver: `429 Too Many Requests`

## ✅ Warnings Normales

Los siguientes warnings son **normales** y no afectan el funcionamiento:

```
WalletManager not found
FundManager not found
VolumeBot not found
MasterWalletManager not found
PumpFunBot not found
PumpFunOnChainSearch not found
configManager not found, using in-memory config with persistence
```

Estos son módulos opcionales que el servidor intenta cargar pero no son necesarios para el funcionamiento básico. El servidor funciona correctamente sin ellos.

## 🎯 Resultado Esperado

Después de configurar Helius RPC:

```
🔗 Using RPC: https://mainnet.helius-rpc.com/?api-key=...
🔌 Starting WebSocket listener for pump.fun...
🚀 Server running on http://0.0.0.0:8080
✅ No más errores 429
```

## 📊 Verificar que Funciona

```bash
# Probar el backend
curl https://web-production-a1176.up.railway.app/api/health

# Deberías recibir:
# {"status":"ok"}
```

## 💡 Nota sobre Rate Limits

- **RPC Público**: ~10-20 requests/minuto (muy limitado)
- **Helius Gratis**: 100,000 requests/día (suficiente para desarrollo)
- **Helius Pro**: Sin límites (para producción)

Para producción, considera actualizar a un plan de pago si necesitas más requests.


