# 🎯 Recomendaciones para Token Explorer - Plan de Acción

## 📊 Estado Actual (Lo que ya tienes bien ✅)

1. ✅ **WebSocket On-Chain** (Helius) - Detecta tokens nuevos en tiempo real
2. ✅ **Sistema híbrido** - Combina on-chain + APIs (DexScreener)
3. ✅ **Cache en memoria** - Reduce llamadas repetidas
4. ✅ **MongoDB configurado** - Base de datos lista para indexación
5. ✅ **Fallback on-chain** - Cuando APIs fallan

---

## 🚀 Recomendaciones Prioritarias

### **PRIORIDAD 1: Indexación en MongoDB (Alto Impacto, Medio Esfuerzo)**

**Problema actual:** Los datos on-chain se pierden al reiniciar el servidor (solo están en memoria).

**Solución:** Usar MongoDB para persistir tokens detectados on-chain.

#### Implementación:

```typescript
// server/token-indexer.ts (NUEVO)
import mongoose from 'mongoose';

// Schema para tokens indexados
const TokenIndexSchema = new mongoose.Schema({
  mint: { type: String, required: true, unique: true, index: true },
  name: String,
  symbol: String,
  imageUrl: String,
  // Datos on-chain (siempre disponibles)
  createdAt: { type: Date, required: true, index: true },
  creator: String,
  bondingCurve: String,
  source: { type: String, enum: ['pumpfun', 'raydium', 'unknown'] },
  // Datos de APIs (pueden estar desactualizados)
  price: Number,
  marketCap: Number,
  liquidity: Number,
  volume24h: Number,
  holders: Number,
  // Metadata de enriquecimiento
  lastEnrichedAt: Date,
  enrichmentSource: String, // 'dexscreener', 'onchain', 'pumpfun'
  // Flags calculados
  isNew: { type: Boolean, index: true },
  isGraduating: { type: Boolean, index: true },
  isTrending: { type: Boolean, index: true },
  riskScore: Number,
}, { timestamps: true });

export const TokenIndex = mongoose.model('TokenIndex', TokenIndexSchema);
```

**Beneficios:**
- ✅ Persistencia: Tokens no se pierden al reiniciar
- ✅ Búsqueda rápida: Índices en MongoDB
- ✅ Historial: Puedes trackear cambios de precio/volumen
- ✅ Menos dependencia de APIs: Datos on-chain siempre disponibles

**Esfuerzo:** 2-3 horas  
**Impacto:** ⭐⭐⭐⭐⭐

---

### **PRIORIDAD 2: Cache Inteligente con TTL (Alto Impacto, Bajo Esfuerzo)**

**Problema actual:** Cache muy corto (30 segundos), siempre llama a APIs.

**Solución:** Cache más inteligente con diferentes TTL según tipo de dato.

#### Implementación:

```typescript
// Mejorar server/token-feed.ts
class TokenFeedService {
  // Cache con diferentes TTLs
  private metadataCache = new Map<string, { data: any; expires: number }>();
  private priceCache = new Map<string, { data: any; expires: number }>();
  private volumeCache = new Map<string, { data: any; expires: number }>();

  // TTLs diferentes según tipo de dato
  private TTL = {
    metadata: 3600000,    // 1 hora (nombres, símbolos no cambian mucho)
    price: 60000,         // 1 minuto (precios cambian rápido)
    volume: 300000,       // 5 minutos (volumen cambia moderadamente)
    marketCap: 120000,    // 2 minutos
  };

  private async enrichTokenData(mint: string): Promise<void> {
    // 1. Verificar cache primero
    const cached = this.metadataCache.get(mint);
    if (cached && Date.now() < cached.expires) {
      console.log(`📦 Using cached metadata for ${mint}`);
      return; // Ya tenemos datos frescos
    }

    // 2. Solo llamar API si cache expiró
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) return;

      const data = await response.json();
      const pair = data.pairs?.[0];
      if (!pair) return;

      // 3. Guardar en cache con TTL
      this.metadataCache.set(mint, {
        data: pair,
        expires: Date.now() + this.TTL.metadata
      });

      // ... resto del código
    } catch (error) {
      // Si API falla, usar datos on-chain que ya tenemos
      console.log(`⚠️ API failed for ${mint}, using on-chain data only`);
    }
  }
}
```

**Beneficios:**
- ✅ Reduce llamadas a APIs en 70-80%
- ✅ Mejor performance (menos latencia)
- ✅ Menos riesgo de rate limits
- ✅ Funciona aunque APIs fallen (usa datos on-chain)

**Esfuerzo:** 1-2 horas  
**Impacto:** ⭐⭐⭐⭐

---

### **PRIORIDAD 3: Worker Background para Enriquecimiento (Medio Impacto, Medio Esfuerzo)**

**Problema actual:** Enriquecimiento de metadata solo cuando se necesita (on-demand).

**Solución:** Worker que enriquece tokens en background continuamente.

#### Implementación:

```typescript
// server/token-enricher-worker.ts (NUEVO)
class TokenEnricherWorker {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('🔄 Starting token enricher worker...');

    // Enriquecer tokens cada 5 minutos
    this.interval = setInterval(async () => {
      await this.enrichBatch();
    }, 5 * 60 * 1000);

    // Primera ejecución inmediata
    await this.enrichBatch();
  }

  private async enrichBatch() {
    try {
      // 1. Obtener tokens que necesitan enriquecimiento
      const tokensToEnrich = await this.getTokensNeedingEnrichment();

      console.log(`🔄 Enriching ${tokensToEnrich.length} tokens...`);

      // 2. Procesar en batches pequeños para no saturar APIs
      const batchSize = 5;
      for (let i = 0; i < tokensToEnrich.length; i += batchSize) {
        const batch = tokensToEnrich.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(mint => this.enrichToken(mint))
        );

        // Delay entre batches para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`✅ Enriched ${tokensToEnrich.length} tokens`);
    } catch (error) {
      console.error('Error in enricher worker:', error);
    }
  }

  private async getTokensNeedingEnrichment(): Promise<string[]> {
    // Priorizar:
    // 1. Tokens nuevos (< 1 hora)
    // 2. Tokens sin metadata
    // 3. Tokens con metadata antigua (> 1 hora)
    
    const now = Date.now();
    const tokens: string[] = [];

    for (const [mint, token] of tokenFeed.onChainTokens) {
      const age = now - token.createdAt;
      
      // Prioridad alta: tokens nuevos sin metadata completa
      if (age < 3600000 && (!token.name || token.name.startsWith('Token '))) {
        tokens.push(mint);
      }
    }

    return tokens.slice(0, 50); // Limitar a 50 por ciclo
  }

  private async enrichToken(mint: string): Promise<void> {
    // Reutilizar lógica existente de enrichTokenData
    await tokenFeed.enrichTokenData(mint);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
  }
}

export const tokenEnricherWorker = new TokenEnricherWorker();
```

**Beneficios:**
- ✅ Metadata siempre actualizada
- ✅ No bloquea requests del usuario
- ✅ Mejor UX (datos listos cuando se necesitan)

**Esfuerzo:** 2-3 horas  
**Impacto:** ⭐⭐⭐

---

### **PRIORIDAD 4: Fallback On-Chain Mejorado (Bajo Impacto, Bajo Esfuerzo)**

**Problema actual:** Fallback on-chain básico, no obtiene metadata completa.

**Solución:** Mejorar fallback para obtener metadata desde Metaplex cuando APIs fallan.

#### Implementación:

```typescript
// Mejorar server/token-feed.ts
private async enrichTokenDataOnChain(mint: string): Promise<void> {
  try {
    const { Connection, PublicKey } = require('@solana/web3.js');
    const { Metadata } = require('@metaplex-foundation/mpl-token-metadata');
    
    const connection = new Connection(process.env.RPC_URL);
    const mintPubkey = new PublicKey(mint);

    // 1. Obtener metadata account de Metaplex
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        Metadata.PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      Metadata.PROGRAM_ID
    );

    const metadataAccount = await connection.getAccountInfo(metadataPDA);
    if (!metadataAccount) {
      console.log(`No metadata found on-chain for ${mint}`);
      return;
    }

    // 2. Parsear metadata
    const metadata = Metadata.deserialize(metadataAccount.data)[0];
    
    // 3. Obtener JSON desde URI
    if (metadata.data.uri) {
      const metaResponse = await fetch(metadata.data.uri);
      if (metaResponse.ok) {
        const metaJson = await metaResponse.json();
        
        const existing = this.onChainTokens.get(mint);
        if (existing) {
          existing.name = metaJson.name || existing.name;
          existing.symbol = metaJson.symbol || existing.symbol;
          existing.imageUrl = metaJson.image || existing.imageUrl;
        }
      }
    }

    // 4. Obtener supply y holders básicos
    const { getMint } = require('@solana/spl-token');
    const mintInfo = await getMint(connection, mintPubkey);
    
    const existing = this.onChainTokens.get(mint);
    if (existing) {
      existing.supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
    }

  } catch (error) {
    console.log(`On-chain enrichment failed for ${mint}:`, error.message);
  }
}
```

**Beneficios:**
- ✅ Funciona aunque APIs estén caídas
- ✅ Datos básicos siempre disponibles
- ✅ Mejor resiliencia

**Esfuerzo:** 1-2 horas  
**Impacto:** ⭐⭐⭐

---

### **PRIORIDAD 5: Rate Limiting Inteligente (Bajo Impacto, Bajo Esfuerzo)**

**Problema actual:** Puede exceder rate limits de APIs.

**Solución:** Rate limiter con backoff exponencial.

#### Implementación:

```typescript
// server/rate-limiter.ts (NUEVO)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits = {
    dexscreener: { max: 10, window: 60000 }, // 10 req/min
    pumpfun: { max: 5, window: 60000 },      // 5 req/min
  };

  canMakeRequest(service: 'dexscreener' | 'pumpfun'): boolean {
    const limit = this.limits[service];
    const now = Date.now();
    const key = service;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requests = this.requests.get(key)!;
    
    // Limpiar requests antiguos
    const recent = requests.filter(time => now - time < limit.window);
    this.requests.set(key, recent);

    return recent.length < limit.max;
  }

  recordRequest(service: 'dexscreener' | 'pumpfun'): void {
    const key = service;
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    this.requests.get(key)!.push(Date.now());
  }

  async waitIfNeeded(service: 'dexscreener' | 'pumpfun'): Promise<void> {
    while (!this.canMakeRequest(service)) {
      const waitTime = 1000; // Esperar 1 segundo
      console.log(`⏳ Rate limit reached for ${service}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

export const rateLimiter = new RateLimiter();
```

**Uso:**

```typescript
// En enrichTokenData
private async enrichTokenData(mint: string): Promise<void> {
  // Esperar si hay rate limit
  await rateLimiter.waitIfNeeded('dexscreener');
  
  try {
    const response = await fetch(/* ... */);
    rateLimiter.recordRequest('dexscreener');
    // ...
  } catch (error) {
    // ...
  }
}
```

**Beneficios:**
- ✅ Evita errores 429
- ✅ Más confiable
- ✅ Mejor experiencia de usuario

**Esfuerzo:** 1 hora  
**Impacto:** ⭐⭐

---

## 📋 Plan de Implementación Sugerido

### **Semana 1: Fundación**
1. ✅ **Día 1-2:** Indexación en MongoDB (Prioridad 1)
2. ✅ **Día 3:** Cache inteligente con TTL (Prioridad 2)

### **Semana 2: Optimización**
3. ✅ **Día 1-2:** Worker background (Prioridad 3)
4. ✅ **Día 3:** Fallback on-chain mejorado (Prioridad 4)

### **Semana 3: Robustez**
5. ✅ **Día 1:** Rate limiting (Prioridad 5)
6. ✅ **Día 2-3:** Testing y ajustes

---

## 🎯 Resultado Esperado

Después de implementar estas mejoras:

### **Antes:**
- ❌ Datos se pierden al reiniciar
- ❌ Muchas llamadas a APIs (rate limits)
- ❌ Metadata puede estar desactualizada
- ❌ Fallback básico

### **Después:**
- ✅ Datos persistentes en MongoDB
- ✅ 70-80% menos llamadas a APIs
- ✅ Metadata siempre actualizada (worker background)
- ✅ Fallback robusto on-chain
- ✅ Sin errores 429 (rate limiting)
- ✅ Mejor performance y UX

---

## 💡 Bonus: Mejoras Futuras (Opcional)

### 1. **GraphQL API Propia**
- Endpoint único para todos los datos
- Queries optimizadas
- Menos dependencia de APIs externas

### 2. **WebSocket Público**
- Clientes pueden suscribirse a updates
- Real-time sin polling
- Mejor para dashboards

### 3. **Analytics Propios**
- Trackear métricas propias
- Detectar patrones
- Alertas personalizadas

---

## 🚦 Decisión: ¿Qué Implementar?

### **Opción A: Mínimo Viable (1-2 días)**
- ✅ Cache inteligente (Prioridad 2)
- ✅ Rate limiting (Prioridad 5)

**Resultado:** Mejora inmediata, bajo esfuerzo

### **Opción B: Recomendado (1 semana)**
- ✅ Todas las Prioridades 1-5

**Resultado:** Sistema robusto y escalable

### **Opción C: Completo (2-3 semanas)**
- ✅ Todas las prioridades
- ✅ Bonus features

**Resultado:** Sistema de nivel producción

---

## 📝 Conclusión

**Mi recomendación:** Empezar con **Opción A** (mínimo viable) para ver mejoras rápidas, luego expandir a **Opción B** cuando tengas tiempo.

El enfoque híbrido actual es correcto, solo necesita estas optimizaciones para ser más robusto y eficiente.

¿Quieres que implemente alguna de estas mejoras ahora?

