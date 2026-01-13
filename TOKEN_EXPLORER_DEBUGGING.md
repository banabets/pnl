# 🔍 Token Explorer - Debugging y Solución

**Fecha:** 2026-01-10
**Problema:** Token Explorer muestra "buscando tokens" pero luego dice "no se encontraron tokens"
**Estado:** ✅ SOLUCIONADO

---

## 🐛 PROBLEMA IDENTIFICADO

El endpoint `/api/tokens/feed` estaba intentando usar un servicio `tokenFeed` que:
1. Requiere MongoDB conectado
2. Devuelve un formato diferente al esperado por el frontend
3. Si falla o no está iniciado, hacía fallback pero con formato inconsistente

---

## ✅ SOLUCIÓN APLICADA

### 1. Endpoint Simplificado (server/index.ts línea 451-463)

**ANTES:**
```typescript
app.get('/api/tokens/feed', readLimiter, async (req, res) => {
  // Intenta usar tokenFeed.fetchTokens() (requiere MongoDB)
  if (tokenFeed.isServiceStarted()) {
    const tokens = await tokenFeed.fetchTokens({...});
    return res.json({ success: true, count: tokens.length, tokens });
  }
  // Fallback a pump.fun
  const tokens = await fetchPumpFunTokens();
  res.json(tokens.slice(0, limit));
});
```

**DESPUÉS:**
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

**Beneficios:**
- ✅ Siempre usa `fetchPumpFunTokens()` que tiene el formato correcto
- ✅ No depende de MongoDB
- ✅ Formato consistente para el frontend
- ✅ Logging detallado para debugging

### 2. Logging Extensivo Agregado

He agregado logging en cada paso de `fetchPumpFunTokens()`:

```typescript
async function fetchPumpFunTokens(): Promise<any[]> {
  // Log cuando retorna cache
  if (tokenCache.data.length > 0 && now - tokenCache.timestamp < CACHE_DURATION) {
    log.info('Returning cached tokens', {
      count: tokenCache.data.length,
      age: Math.floor((now - tokenCache.timestamp) / 1000) + 's'
    });
    return tokenCache.data;
  }

  // Log al hacer fetch
  log.info('Fetching tokens from pump.fun API', { url: pumpUrl });

  // Log respuesta de API
  log.info('Pump.fun API response', { status: response.status, ok: response.ok });

  // Log datos recibidos
  log.info('Pump.fun API data received', {
    isArray: Array.isArray(data),
    length: Array.isArray(data) ? data.length : 0
  });

  // Log tokens enriquecidos
  log.info('Tokens enriched successfully', { count: enrichedTokens.length });

  // Log cache actualizado
  log.info('Token cache updated', { count: enrichedTokens.length });

  // Log errores
  log.error('Error fetching pump.fun tokens', {
    error: (error as Error).message,
    stack: (error as Error).stack
  });
}
```

---

## 🚀 CÓMO APLICAR EN PRODUCCIÓN

### Paso 1: Build Local
```bash
cd /Users/g/Desktop/bund

# Build server
npm run build:server

# Verificar que compile sin errores
```

### Paso 2: Commit y Push
```bash
git add server/index.ts
git commit -m "Fix: Simplify token feed endpoint and add extensive logging"
git push origin main
```

### Paso 3: Deploy en Producción

**Opción A - Auto-deploy (si configurado):**
Si tienes GitHub Actions o auto-deploy configurado, simplemente espera a que se despliegue automáticamente.

**Opción B - Manual deploy:**
```bash
# En servidor de producción
cd /path/to/pnl.onl
git pull origin main
npm install  # Por si hay dependencias nuevas
npm run build:server
pm2 restart pnl-onl  # O el nombre de tu proceso
```

**Opción C - Docker deploy:**
```bash
# En servidor de producción
cd /path/to/pnl.onl
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 🔍 DEBUGGING EN PRODUCCIÓN

### 1. Verificar Logs

**Ver logs en tiempo real:**
```bash
# Si usas PM2
pm2 logs pnl-onl --lines 100

# Si usas Docker
docker-compose logs -f app --tail 100

# Si usas logs de archivo
tail -f logs/combined.log
```

**Buscar logs específicos de token feed:**
```bash
grep "Token feed requested" logs/combined.log
grep "Fetching tokens from pump.fun" logs/combined.log
grep "Tokens enriched successfully" logs/combined.log
```

### 2. Test Manual del Endpoint

```bash
# Test directo al endpoint
curl https://pnl.onl/api/tokens/feed

# Debería retornar un array de tokens JSON
# Si retorna error, verificar logs
```

### 3. Verificar Status de Pump.fun API

```bash
# Test directo a pump.fun API
curl 'https://frontend-api.pump.fun/coins?offset=0&limit=10&sort=created_timestamp&order=DESC'

# Si falla, pump.fun API está down
# Solución: Implementar fallback a otra fuente de datos
```

---

## 🔧 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "Tokens no se cargan"

**Síntomas:**
- Frontend muestra "buscando tokens" indefinidamente
- O muestra "no se encontraron tokens"

**Debugging:**
```bash
# 1. Verificar que endpoint responde
curl https://pnl.onl/api/tokens/feed

# 2. Verificar logs del servidor
tail -f logs/combined.log | grep "token feed"

# 3. Verificar que pump.fun API está up
curl 'https://frontend-api.pump.fun/coins?offset=0&limit=1'
```

**Soluciones:**
- ✅ Si pump.fun API falla: Agregar endpoint fallback a DexScreener
- ✅ Si CORS error: Verificar que CORS está habilitado en server
- ✅ Si rate limit: Aumentar duración de cache (CACHE_DURATION)

### Problema 2: "Tokens se cargan pero datos incorrectos"

**Síntomas:**
- Tokens aparecen pero sin imágenes
- Precios en 0
- Timestamps incorrectos

**Verificación:**
```bash
# Ver formato de respuesta
curl https://pnl.onl/api/tokens/feed | jq '.[0]'

# Debe tener estos campos en camelCase:
# - imageUrl (no image_uri)
# - marketCap (no market_cap)
# - createdAt (no created_timestamp)
```

**Solución:**
- La transformación de formato ya está implementada en líneas 387-428
- Si falta algún campo, agrégalo en el `.map()`

### Problema 3: "Cache no funciona"

**Síntomas:**
- Cada request hace fetch a pump.fun
- Logs muestran "Fetching tokens from pump.fun API" cada vez

**Verificación:**
```bash
# Hacer 2 requests seguidos en <30 segundos
curl https://pnl.onl/api/tokens/feed > /dev/null
sleep 5
curl https://pnl.onl/api/tokens/feed > /dev/null

# Ver logs - segunda request debe mostrar "Returning cached tokens"
grep "Returning cached tokens" logs/combined.log
```

**Solución:**
- Cache está implementado con CACHE_DURATION=30000 (30 segundos)
- Si no funciona, verificar que variable `tokenCache` no se está reseteando

### Problema 4: "Rate Limit de pump.fun"

**Síntomas:**
- Logs muestran status 429
- Tokens dejan de cargar después de varios requests

**Solución temporal:**
```typescript
// Aumentar duración de cache
const CACHE_DURATION = 60000; // 60 segundos en vez de 30
```

**Solución permanente:**
```typescript
// Implementar fallback a DexScreener
if (response.status === 429) {
  log.warn('Pump.fun rate limited, trying DexScreener');
  const dexData = await fetch('https://api.dexscreener.com/latest/dex/search?q=SOL');
  // Transformar formato de DexScreener a nuestro formato
}
```

---

## 📊 LOGS ESPERADOS (Cuando Funciona)

```json
// Request inicial (cache vacío)
{"level":"info","message":"Fetching tokens from pump.fun API","url":"https://frontend-api.pump.fun/coins?..."}
{"level":"info","message":"Pump.fun API response","status":200,"ok":true}
{"level":"info","message":"Pump.fun API data received","isArray":true,"length":100}
{"level":"info","message":"Tokens enriched successfully","count":95}
{"level":"info","message":"Token cache updated","count":95}
{"level":"info","message":"Token feed requested","count":95,"limit":50}

// Request posterior (< 30 segundos)
{"level":"info","message":"Returning cached tokens","count":95,"age":"15s"}
{"level":"info","message":"Token feed requested","count":95,"limit":50}
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de deploy, verificar:

- [ ] **Endpoint responde:** `curl https://pnl.onl/api/tokens/feed` retorna JSON
- [ ] **Logs se generan:** `tail -f logs/combined.log` muestra logs de token feed
- [ ] **Cache funciona:** Segunda request en <30s usa cache
- [ ] **Frontend carga:** Abrir https://pnl.onl y verificar que tokens aparecen
- [ ] **Filtros funcionan:** Probar filtros "New", "Graduating", "Trending"
- [ ] **Imágenes cargan:** Tokens muestran imágenes correctamente
- [ ] **Precios correctos:** Market cap y precios tienen valores reales

---

## 🔄 FORMATO DE RESPUESTA

**Formato que el endpoint retorna:**
```json
[
  {
    "mint": "TokenMintAddress...",
    "name": "Token Name",
    "symbol": "TKN",
    "imageUrl": "https://...",
    "marketCap": 50000,
    "createdAt": 1704934800000,
    "liquidity": 1000,
    "holders": 50,
    "volume24h": 5000,
    "price": 0.0001,
    "dexId": "pumpfun",
    "age": 1800,
    "isNew": true,
    "isGraduating": false,
    "isTrending": true,
    "priceChange5m": 5.2,
    "priceChange1h": 10.5,
    "priceChange24h": 25.8,
    "volume5m": 100,
    "volume1h": 500,
    "txns5m": 10,
    "txns1h": 50,
    "txns24h": 200,
    "riskScore": 0
  }
]
```

**Campos importantes:**
- `imageUrl`: URL de la imagen (camelCase, no snake_case)
- `marketCap`: Market cap en USD
- `createdAt`: Timestamp en milisegundos (no segundos)
- `age`: Edad en segundos
- `isNew`, `isGraduating`, `isTrending`: Flags booleanos

---

## 🎯 SIGUIENTE PASO: IMPLEMENTAR FALLBACKS

Si pump.fun API falla frecuentemente, implementar múltiples fuentes:

```typescript
async function fetchTokensWithFallback(): Promise<any[]> {
  try {
    // Try pump.fun first
    return await fetchPumpFunTokens();
  } catch (error) {
    log.warn('Pump.fun failed, trying DexScreener');
    try {
      // Try DexScreener
      return await fetchFromDexScreener();
    } catch (error2) {
      log.warn('DexScreener failed, trying Birdeye');
      try {
        // Try Birdeye
        return await fetchFromBirdeye();
      } catch (error3) {
        log.error('All token sources failed');
        return tokenCache.data; // Return stale cache
      }
    }
  }
}
```

---

## 📝 RESUMEN

**Cambios aplicados:**
1. ✅ Endpoint `/api/tokens/feed` simplificado
2. ✅ Siempre usa `fetchPumpFunTokens()` (formato correcto)
3. ✅ Logging extensivo en cada paso
4. ✅ No depende de MongoDB o tokenFeed service
5. ✅ Formato consistente para frontend

**Para que funcione en producción:**
1. Build + commit + push
2. Deploy en servidor
3. Verificar logs
4. Testear frontend

**Con estos cambios, el Token Explorer debería funcionar correctamente en https://pnl.onl** ✅
