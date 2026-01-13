# 🔧 Guía de Aplicación de Optimizaciones

Este documento explica cómo aplicar gradualmente las optimizaciones creadas a `server/index.ts`.

---

## 📋 Cambios a Realizar

### 1. Agregar Imports (Al inicio del archivo, después de línea 14)

```typescript
// Logging
import logger, { log, logApiRequest, logApiResponse, logTrade, logWallet, logSecurity } from './logger';

// Rate Limiting
import {
  generalLimiter,
  authLimiter,
  tradingLimiter,
  walletLimiter,
  adminLimiter,
  readLimiter,
  alertsLimiter,
  fundsLimiter,
} from './http-rate-limiter';

// Validation
import {
  validateBody,
  registerSchema,
  loginSchema,
  tradingExecuteSchema,
  distributeFromMasterSchema,
  recoverToMasterSchema,
  emergencyRecoverSchema,
  createAlertSchema,
  createStopLossSchema,
} from './validators';

// Health Checks
import {
  healthCheckHandler,
  livenessProbe,
  readinessProbe,
  startupProbe,
} from './health-check';

// Metrics
import { metricsMiddleware, metricsHandler, businessMetrics } from './metrics';

// Sentry
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './sentry';
```

---

### 2. Inicializar Sentry (Después de crear app)

```typescript
const app = express();

// Initialize Sentry (must be first middleware)
initSentry(app);
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());
```

---

### 3. Agregar Middleware de Métricas (Después de CORS)

```typescript
app.use(cors());

// Metrics middleware
app.use(metricsMiddleware);
```

---

### 4. Agregar Health Check Endpoints (Antes de otros endpoints)

```typescript
// ==========================================
// Health Check Endpoints
// ==========================================
app.get('/health', healthCheckHandler);
app.get('/healthz/live', livenessProbe);
app.get('/healthz/ready', readinessProbe);
app.get('/healthz/startup', startupProbe);

// Metrics endpoint
app.get('/metrics', metricsHandler);
```

---

### 5. Aplicar Rate Limiters a Endpoints de Autenticación

**ANTES:**
```typescript
app.post('/api/auth/register', async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/auth/register', authLimiter, validateBody(registerSchema), async (req, res) => {
```

**ANTES:**
```typescript
app.post('/api/auth/login', async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/auth/login', authLimiter, validateBody(loginSchema), async (req, res) => {
```

---

### 6. Aplicar Rate Limiters a Endpoints de Fondos

**ANTES:**
```typescript
app.post('/api/funds/emergency-recover', authenticateToken, requireRole(['admin']), async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/funds/emergency-recover',
  adminLimiter,
  authenticateToken,
  requireRole(['admin']),
  validateBody(emergencyRecoverSchema),
  async (req, res) => {
```

**ANTES:**
```typescript
app.post('/api/funds/distribute-from-master', authenticateToken, async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/funds/distribute-from-master',
  fundsLimiter,
  authenticateToken,
  validateBody(distributeFromMasterSchema),
  async (req, res) => {
```

**ANTES:**
```typescript
app.post('/api/funds/recover-to-master', authenticateToken, async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/funds/recover-to-master',
  fundsLimiter,
  authenticateToken,
  validateBody(recoverToMasterSchema),
  async (req, res) => {
```

---

### 7. Aplicar Rate Limiters a Endpoints de Trading

**ANTES:**
```typescript
app.post('/api/pumpfun/execute', authenticateToken, async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/pumpfun/execute',
  tradingLimiter,
  authenticateToken,
  validateBody(tradingExecuteSchema),
  async (req, res) => {
```

**ANTES:**
```typescript
app.post('/api/pumpfun/stop', authenticateToken, async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/pumpfun/stop',
  tradingLimiter,
  authenticateToken,
  async (req, res) => {
```

---

### 8. Aplicar Rate Limiters a Endpoints de Alertas

**ANTES:**
```typescript
app.get('/api/alerts', authenticateToken, async (req, res) => {
```

**DESPUÉS:**
```typescript
app.get('/api/alerts',
  readLimiter,
  authenticateToken,
  async (req, res) => {
```

**ANTES:**
```typescript
app.post('/api/alerts/create', authenticateToken, async (req, res) => {
```

**DESPUÉS:**
```typescript
app.post('/api/alerts/create',
  alertsLimiter,
  authenticateToken,
  validateBody(createAlertSchema),
  async (req, res) => {
```

---

### 9. Reemplazar console.log con Logger

**Buscar y reemplazar en todo el archivo:**

```typescript
// ANTES
console.log('Server started')

// DESPUÉS
log.info('Server started')
```

```typescript
// ANTES
console.error('Error:', error)

// DESPUÉS
log.error('Error occurred', { error: error.message, stack: error.stack })
```

```typescript
// ANTES
console.warn('Warning message')

// DESPUÉS
log.warn('Warning message')
```

---

### 10. Agregar Sentry Error Handler (Al final, antes de app.listen)

```typescript
// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// Final error handler
app.use((err: any, req: any, res: any, next: any) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});
```

---

## 🔄 Aplicación Gradual Recomendada

### Fase 1 (CRÍTICO - 10 min):
1. Agregar todos los imports
2. Inicializar Sentry
3. Agregar health checks
4. Agregar metrics middleware

### Fase 2 (IMPORTANTE - 20 min):
1. Aplicar rate limiters a endpoints críticos (auth, funds, trading)
2. Aplicar validators a endpoints críticos

### Fase 3 (MEJORA - 30 min):
1. Reemplazar console.logs principales con logger
2. Agregar Sentry error handler

### Fase 4 (OPCIONAL - variable):
1. Reemplazar TODOS los console.logs (497 ocurrencias)
2. Agregar logging detallado en operaciones críticas

---

## ✅ Verificación

Después de cada fase, verificar:

```bash
# Build
npm run build:server

# Sin errores TypeScript
# Servidor inicia correctamente

# Tests pasan
npm test
```

---

## 📊 Endpoints que Necesitan Rate Limiters

| Endpoint | Rate Limiter | Validator | Prioridad |
|----------|--------------|-----------|-----------|
| `/api/auth/register` | `authLimiter` | `registerSchema` | 🔴 ALTA |
| `/api/auth/login` | `authLimiter` | `loginSchema` | 🔴 ALTA |
| `/api/funds/emergency-recover` | `adminLimiter` | `emergencyRecoverSchema` | 🔴 ALTA |
| `/api/funds/distribute-from-master` | `fundsLimiter` | `distributeFromMasterSchema` | 🔴 ALTA |
| `/api/funds/recover-to-master` | `fundsLimiter` | `recoverToMasterSchema` | 🔴 ALTA |
| `/api/pumpfun/execute` | `tradingLimiter` | `tradingExecuteSchema` | 🔴 ALTA |
| `/api/pumpfun/stop` | `tradingLimiter` | - | 🟡 MEDIA |
| `/api/volume/start` | `tradingLimiter` | - | 🟡 MEDIA |
| `/api/volume/stop` | `tradingLimiter` | - | 🟡 MEDIA |
| `/api/alerts` | `readLimiter` | - | 🟢 BAJA |
| `/api/alerts/create` | `alertsLimiter` | `createAlertSchema` | 🟡 MEDIA |
| `/api/alerts/cancel/:id` | `alertsLimiter` | - | 🟡 MEDIA |
| Otros GET | `readLimiter` | - | 🟢 BAJA |

---

## 🎯 Script de Aplicación Rápida

He creado un script que aplica automáticamente las optimizaciones críticas.
Ver: `scripts/apply-optimizations.sh` (próximo paso)
