# 🚀 Setup Instructions - Production Ready

Esta guía te llevará paso a paso para configurar tu proyecto de manera segura.

---

## ✅ FASE 1 COMPLETADA

### Lo que hemos arreglado:

1. ✅ **Variables de Entorno Seguras**
   - Sistema de validación automático al inicio
   - `.env.example` actualizado con todas las variables necesarias
   - Script para generar valores seguros

2. ✅ **API Keys Protegidas**
   - Eliminadas TODAS las API keys hardcodeadas (11 instancias)
   - El proyecto ahora usa variables de entorno exclusivamente
   - ⚠️ **IMPORTANTE:** El API key `7b05747c-b100-4159-ba5f-c85e8c8d3997` está EXPUESTO PÚBLICAMENTE - debes revocarlo

3. ✅ **Endpoints Asegurados**
   - 7 endpoints críticos ahora requieren autenticación
   - Emergency recover requiere rol de admin
   - Ya no es posible robar fondos sin autenticación

---

## 📋 PRÓXIMOS PASOS ANTES DE INICIAR

### Paso 1: Revocar API Key Expuesta

**🚨 CRÍTICO - HACER PRIMERO:**

1. Ve a https://helius.dev
2. Inicia sesión
3. **REVOCA** el API key: `7b05747c-b100-4159-ba5f-c85e8c8d3997`
4. Genera un **NUEVO** API key

---

### Paso 2: Generar Archivo .env

Opción A - **Automático** (Recomendado):
```bash
node scripts/generate-env.js
```
Sigue las instrucciones interactivas.

Opción B - **Manual**:
```bash
# 1. Copiar el template
cp .env.example .env

# 2. Generar JWT_SECRET
openssl rand -base64 64

# 3. Generar ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Editar .env y pegar los valores generados
nano .env  # o usa tu editor favorito
```

**Variables OBLIGATORIAS:**
- `JWT_SECRET` - Para autenticación (generado arriba)
- `ENCRYPTION_KEY` - Para encriptar wallets (generado arriba)
- `HELIUS_API_KEY` - Tu NUEVO API key de Helius
- `MONGODB_URI` - Tu conexión a MongoDB

---

### Paso 3: Verificar MongoDB

**MongoDB Cloud (Recomendado para producción):**
1. Ve a https://www.mongodb.com/cloud/atlas
2. Crea un cluster gratuito
3. Obtén tu connection string
4. Agrégalo a `.env` como `MONGODB_URI`

**MongoDB Local (Solo para desarrollo):**
```bash
# En Mac con Homebrew:
brew install mongodb-community
brew services start mongodb-community

# En Linux:
sudo apt-get install mongodb
sudo systemctl start mongodb

# La URI por defecto es:
MONGODB_URI=mongodb://localhost:27017/pnl-onl
```

---

### Paso 4: Instalar Dependencias

```bash
# Instalar dependencias del servidor
npm install

# Instalar dependencias del frontend
cd web && npm install && cd ..
```

---

### Paso 5: Compilar el Proyecto

```bash
# Compilar backend
npm run build:server

# Compilar frontend
npm run build:web

# O compilar todo:
npm run build:full
```

---

### Paso 6: Iniciar el Servidor

```bash
npm start
```

Si todo está configurado correctamente, verás:

```
🔍 Validating environment variables...
✅ All environment variables validated successfully!

🔗 Using RPC: https://mainnet.helius-rpc.com/?api-key=...
✅ Connected to MongoDB
✅ Jupiter Aggregator initialized (0.5% trading fee)
✅ Trading Bots initialized (Sniper, DCA, Copy Trading)
```

---

## ⚠️ ADVERTENCIAS IMPORTANTES

### 🔐 Seguridad

1. **NUNCA commitear el archivo `.env`** - ya está en `.gitignore`
2. **Respaldar `ENCRYPTION_KEY`** - si lo pierdes, pierdes TODAS las wallets
3. **Mantener `JWT_SECRET` secreto** - controla toda la autenticación
4. **Usar HTTPS en producción** - nunca HTTP

### 💾 Backup

Haz backup de:
- Tu archivo `.env` (en lugar seguro, NO en git)
- Tu base de datos MongoDB
- El directorio `keypairs/` si usas JSON fallback

### 🚨 Antes de Producción

**TODAVÍA NO ESTÁ LISTO PARA PRODUCCIÓN.**

Falta completar:
- ❌ Stop-loss funcional
- ❌ Price alerts funcionales
- ❌ Tests
- ❌ Rate limiting en todos los endpoints
- ❌ Logging estructurado
- ❌ Monitoreo con Sentry

---

## 🐛 Troubleshooting

### Error: "JWT_SECRET must be set"
**Solución:** Genera tu `.env` con `node scripts/generate-env.js`

### Error: "ENCRYPTION_KEY must be exactly 64 hexadecimal characters"
**Solución:** Regenera con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Error: "MongoDB connection error"
**Solución:**
1. Verifica que MongoDB esté corriendo
2. Verifica tu `MONGODB_URI` en `.env`
3. Verifica las credenciales y whitelist IP en MongoDB Atlas

### Error: "HELIUS_API_KEY is using the EXPOSED key"
**Solución:** Estás usando el API key público expuesto. Revócalo y genera uno nuevo.

---

## 📊 Verificación

Para verificar que todo está funcionando:

```bash
# 1. Verificar que el servidor inicia sin errores
npm start

# 2. En otra terminal, verificar health check:
curl http://localhost:3001/api/health

# 3. Deberías ver:
{"status":"ok","timestamp":"2026-01-10T..."}
```

---

## 🔜 Siguiente Fase

Una vez que el servidor esté funcionando correctamente, continuaremos con:

**FASE 1.4:** Implementar stop-loss funcional
**FASE 1.5:** Implementar price alerts
**FASE 1.6:** Testing y validación completa

---

## 📞 Soporte

Si encuentras problemas, revisa:
1. Los logs del servidor
2. El archivo `BUGS.md` para problemas conocidos
3. Este archivo para soluciones comunes

---

**✨ Una vez completado este setup, tu proyecto estará en un estado MUCHO más seguro que antes!**
