# 📦 Instrucciones para Enviar/Compartir el Proyecto

## ✅ Archivo Comprimido Creado

Se ha creado un archivo `.tar.gz` en el directorio padre con el proyecto listo para enviar:

```
../bund-project-YYYYMMDD-HHMMSS.tar.gz
```

## 📋 Contenido del Proyecto

El proyecto incluye:
- ✅ Código fuente completo (`src/`)
- ✅ Servidor web (`server/`)
- ✅ Interfaz web (`web/`)
- ✅ Configuración TypeScript
- ✅ Documentación (guías y README)
- ✅ Scripts de inicio

**NO incluye:**
- ❌ `node_modules/` (se instalan con `npm install`)
- ❌ `keypairs/` (wallets privadas - NUNCA compartir)
- ❌ `.env` (configuración sensible)
- ❌ Archivos de build (se generan al compilar)

## 🚀 Instrucciones para el Receptor

### 1. Extraer el Proyecto
```bash
tar -xzf bund-project-*.tar.gz
cd bund
```

### 2. Instalar Dependencias
```bash
# Dependencias principales
npm install

# Dependencias del frontend
cd web
npm install
cd ..
```

### 3. Configurar Variables de Entorno
Crear archivo `.env` en la raíz:
```bash
RPC_URL=https://api.mainnet-beta.solana.com
# O usar un RPC privado (recomendado):
# RPC_URL=https://your-private-rpc-url.com

SIMULATION_MODE=true
SLIPPAGE_BPS=50
MIN_SOL_BALANCE=0.1
MAX_SOL_PER_SWAP=0.05
```

### 4. Compilar el Proyecto
```bash
# Compilar TypeScript
npm run build

# Compilar frontend (ya está compilado, pero si necesita recompilar)
cd web
npm run build
cd ..
```

### 5. Iniciar el Servidor Web
```bash
node start-web.js
```

O manualmente:
```bash
# Compilar servidor
npx tsc server/index.ts --outDir dist-server --esModuleInterop

# Iniciar servidor
node dist-server/server/index.js
```

### 6. Acceder a la Interfaz
Abrir en el navegador:
```
http://localhost:3001
```

## ⚠️ Importante

1. **NUNCA compartir `keypairs/`** - Contiene wallets privadas con acceso a fondos
2. **NUNCA compartir `.env`** - Puede contener claves API privadas
3. **El receptor debe crear sus propias wallets** usando el bot

## 📚 Documentación Incluida

- `README.md` - Documentación general
- `PUMP_BOT_GUIDE.md` - Guía del bot de pump.fun
- `PUMPFUN_GUIDE.md` - Guía específica de pump.fun
- `WEB_SETUP.md` - Guía de configuración web
- `IMPORTANTE.md` - Notas importantes sobre wallets y simulación

## 🔧 Requisitos del Sistema

- Node.js 18+ 
- npm o yarn
- Acceso a internet (para RPC de Solana)

## 💡 Notas Adicionales

- El proyecto está en modo simulación por defecto (seguro)
- Para trading real, cambiar `SIMULATION_MODE=false` en `.env`
- Se recomienda usar un RPC privado para evitar rate limiting
- La búsqueda on-chain de tokens puede fallar con RPC públicos




