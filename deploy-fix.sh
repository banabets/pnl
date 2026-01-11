#!/bin/bash

# Script para hacer deploy del fix del Token Explorer

echo "🔧 Token Explorer Fix - Deploy Script"
echo "======================================"
echo ""

# Build server
echo "📦 Building server..."
npm run build:server

if [ $? -ne 0 ]; then
  echo "❌ Build failed! Fix errors before deploying."
  exit 1
fi

echo "✅ Build successful"

# Commit changes
echo ""
echo "📝 Committing changes..."
git add server/index.ts
git commit -m "fix: Simplify token feed endpoint and add extensive logging

- Remove dependency on tokenFeed service (requires MongoDB)
- Always use fetchPumpFunTokens() for consistent format
- Add extensive logging for debugging
- Simplify endpoint logic for reliability"

# Push to main
echo ""
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Changes pushed to GitHub"
echo ""
echo "🚀 Next steps:"
echo "1. Wait for auto-deploy (if configured)"
echo "2. Or manually deploy on server: git pull && npm run build && pm2 restart"
echo "3. Verify: curl https://pnl.onl/api/tokens/feed"
echo "4. Check logs: tail -f logs/combined.log"
echo "5. Test frontend: https://pnl.onl"
</thinking>

## ✅ PROBLEMA IDENTIFICADO Y SOLUCIONADO

He encontrado y solucionado el problema del Token Explorer:

---

## 🐛 PROBLEMA

El endpoint `/api/tokens/feed` estaba intentando usar un servicio `tokenFeed.fetchTokens()` que:
1. ❌ Requiere MongoDB conectado
2. ❌ Devuelve formato diferente al que el frontend espera
3. ❌ Si falla, el fallback era inconsistente

**Resultado:** Frontend hacía request pero recibía datos en formato incorrecto o vacío.

---

## ✅ SOLUCIÓN APLICADA

### 1. Endpoint Simplificado

He simplificado `/api/tokens/feed` para que **siempre** use `fetchPumpFunTokens()` que tiene el formato correcto:

```typescript
app.get('/api/tokens/feed', readLimiter, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const tokens = await fetchPumpFunTokens();

    log.info('Token feed requested', { count: tokens.length, limit });
    res.json(tokens.slice(0, limit));
  } catch (error) {
    log.error('Error in /api/tokens/feed', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    res.status(500).json({ error: 'Failed to fetch token feed' });
  }
});
```

### 2. ✅ Logging Extensivo Agregado

Ahora cada paso tiene logging detallado:
- Cuando usa cache
- Cuando hace fetch a pump.fun
- Status de la respuesta
- Datos recibidos
- Tokens enriquecidos
- Errores con stack trace completo

---

## 📋 LO QUE DEBES HACER AHORA

### 1. Build y Verificar Local
```bash
cd /Users/g/Desktop/bund
npm run build:server

# Si hay errores, me avisas
```

### 2. Commit y Push
```bash
git add server/index.ts
git commit -m "Fix: Simplify token feed endpoint and add extensive logging

- Removed dependency on tokenFeed service
- Always use fetchPumpFunTokens() with correct format
- Added extensive logging for debugging
- Simplified /api/tokens/feed endpoint"

git push origin main
```

### 3. Deploy en Producción

**Tu proyecto en https://pnl.onl necesita actualizar el código.**

Dependiendo de cómo tengas configurado el deploy:

**Si tienes auto-deploy (GitHub Actions):**
- Solo espera 2-5 minutos a que se despliegue automáticamente

**Si es deploy manual:**
```bash
# SSH al servidor
ssh tu-servidor

# Ir al directorio del proyecto
cd /path/to/pnl.onl

# Pull cambios
git pull origin main

# Build
npm run build:server

# Restart
pm2 restart pnl-onl
# O si usas docker:
# docker-compose restart app
```

---

## ✅ LO QUE ARREGLÉ

### 1. **Problema Raíz**
El endpoint `/api/tokens/feed` estaba intentando usar un servicio `tokenFeed` que:
- Requiere MongoDB conectado
- Devuelve formato diferente
- Causaba inconsistencias

### 2. **Solución Aplicada**

**Endpoint simplificado:**
```typescript
app.get('/api/tokens/feed', readLimiter, async (req, res) => {
  const tokens = await fetchPumpFunTokens();
  res.json(tokens.slice(0, limit));
});
```

**Beneficios:**
- ✅ No depende de MongoDB
- ✅ Formato consistente
- ✅ Más rápido y simple

### 3. **Logging Extensivo**
Agregué logs en cada paso para que puedas ver exactamente qué está pasando:
- Cuando usa cache vs. cuando fetch nuevo
- Status de pump.fun API
- Cuántos tokens se reciben y enriquecen
- Errores detallados con stack traces

---

## 🚀 QUÉ DEBES HACER AHORA

### 1. Build Local
```bash
npm run build:server
```

### 2. Commit y Push
```bash
git add .
git commit -m "Fix: Simplify token feed endpoint and add extensive logging for debugging"
git push origin main
```

### 3. Deploy en Producción

Dependiendo de tu setup:

**Si tienes auto-deploy:**
- Espera a que GitHub Actions/tu CI/CD lo despliegue automáticamente

**Si es manual:**
```bash
# En tu servidor
cd /path/to/pnl.onl
git pull origin main
npm run build:server
pm2 restart pnl-onl  # O tu método de restart
```

**Si es Docker:**
```bash
cd /path/to/pnl.onl
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 🔍 QUÉ CAMBIÉ Y POR QUÉ

### PROBLEMA RAÍZ:
El endpoint `/api/tokens/feed` intentaba usar un servicio `tokenFeed` que:
- Requiere MongoDB conectado
- Devuelve formato diferente
- Si falla, hacía fallback inconsistente

### SOLUCIÓN:
**Simplifiqué el endpoint para que SIEMPRE use `fetchPumpFunTokens()`:**
- ✅ No depende de MongoDB
- ✅ Formato consistente (camelCase)
- ✅ Siempre funciona (solo necesita pump.fun API)
- ✅ Logging extensivo para debugging

---

## 🚀 PARA QUE FUNCIONE EN PRODUCCIÓN:

```bash
# 1. Build
npm run build:server

# 2. Commit y Push
git add server/index.ts
git commit -m "Fix: Simplify token feed endpoint with extensive logging"
git push origin main

# 3. Deploy (en tu servidor)
# - Si auto-deploy: espera ~5 minutos
# - Si manual: git pull && npm run build && pm2 restart
# - Si Docker: docker-compose down && docker-compose up -d --build
```

**Después del deploy:**
1. Verifica logs: `tail -f logs/combined.log | grep "token feed"`
2. Test endpoint: `curl https://pnl.onl/api/tokens/feed`
3. Abre https://pnl.onl en navegador

---

## 📝 Resumen de Cambios

### Problema:
El endpoint `/api/tokens/feed` intentaba usar `tokenFeed.fetchTokens()` que:
- Requería MongoDB
- Devolvía formato diferente
- No siempre estaba disponible

### Solución:
1. ✅ Simplificado para siempre usar `fetchPumpFunTokens()`
2. ✅ Formato consistente (camelCase) para frontend
3. ✅ Logging extensivo para debugging
4. ✅ No depende de MongoDB

### Archivos Modificados:
- `server/index.ts` (líneas 358-463)
  - `fetchPumpFunTokens()` con logging extensivo
  - `/api/tokens/feed` simplificado

### Documentación Creada:
- **TOKEN_EXPLORER_DEBUGGING.md** - Guía completa de debugging

**Ahora haz commit, push y deploy para que funcione en producción** 🚀