# 🗄️ Plan de Migración a MongoDB - Sistema Multi-Usuario

## 🎯 Objetivos

1. **Persistencia Real**: Los datos no se borran al actualizar/reiniciar
2. **Multi-Usuario**: Cada usuario tiene sus propias wallets y datos
3. **Escalabilidad**: Base de datos robusta para producción
4. **Aislamiento**: Datos completamente separados por usuario

---

## 📊 Esquema de Base de Datos (MongoDB)

### 1. **Collection: `users`**
```typescript
{
  _id: ObjectId,
  id: string (UUID),
  username: string (unique, indexed),
  email: string (unique, indexed),
  passwordHash: string,
  createdAt: Date,
  updatedAt: Date,
  lastLogin?: Date,
  emailVerified: boolean,
  role: 'user' | 'admin' | 'premium',
  status: 'active' | 'suspended' | 'banned',
  profile: {
    displayName?: string,
    bio?: string,
    avatar?: string,
    timezone?: string,
    language?: string
  },
  settings: {
    theme?: 'light' | 'dark' | 'auto',
    notifications: {
      email?: boolean,
      priceAlerts?: boolean,
      tradeAlerts?: boolean
    },
    trading: {
      defaultSlippage?: number,
      defaultWalletIndex?: number
    }
  },
  stats: {
    totalTrades: number,
    totalVolume: number,
    totalProfit: number,
    winRate: number
  }
}
```

### 2. **Collection: `sessions`**
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  token: string (indexed),
  createdAt: Date,
  lastActive: Date,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
}
```

### 3. **Collection: `wallets`** (NUEVO - Aislado por usuario)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed),
  index: number,
  publicKey: string,
  encryptedPrivateKey: string, // Encriptado con clave del usuario
  balance: number,
  createdAt: Date,
  updatedAt: Date,
  label?: string,
  isActive: boolean
}
```

### 4. **Collection: `masterWallets`** (NUEVO - Aislado por usuario)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed, unique),
  publicKey: string,
  encryptedPrivateKey: string,
  balance: number,
  createdAt: Date,
  updatedAt: Date
}
```

### 5. **Collection: `positions`** (Portfolio - Aislado por usuario)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed),
  tokenMint: string,
  walletIndex: number,
  entryPrice: number,
  entryAmount: number,
  currentPrice: number,
  pnl: number,
  pnlPercent: number,
  createdAt: Date,
  updatedAt: Date,
  status: 'open' | 'closed'
}
```

### 6. **Collection: `trades`** (Historial - Aislado por usuario)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed),
  tokenMint: string,
  tokenName?: string,
  walletIndex: number,
  tradeType: 'buy' | 'sell',
  solAmount: number,
  tokenAmount: number,
  price: number,
  signature: string,
  timestamp: Date,
  status: 'pending' | 'confirmed' | 'failed'
}
```

### 7. **Collection: `stopLossOrders`** (Aislado por usuario)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed),
  tokenMint: string,
  walletIndex: number,
  type: 'stop-loss' | 'take-profit' | 'trailing-stop',
  triggerPrice: number,
  amount?: number,
  status: 'active' | 'executed' | 'cancelled',
  createdAt: Date,
  executedAt?: Date
}
```

### 8. **Collection: `priceAlerts`** (Aislado por usuario)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed),
  tokenMint: string,
  type: 'price' | 'volume' | 'market-cap',
  condition: 'above' | 'below',
  value: number,
  active: boolean,
  triggeredAt?: Date,
  createdAt: Date
}
```

### 9. **Collection: `activityLogs`** (Aislado por usuario)
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed),
  action: string,
  details: object,
  timestamp: Date,
  ipAddress?: string,
  userAgent?: string
}
```

---

## 🔧 Cambios Necesarios

### 1. **Instalación de Dependencias**
```bash
npm install mongoose @types/mongoose
npm install bcrypt @types/bcrypt  # Para encriptación de private keys
npm install crypto-js @types/crypto-js  # Para encriptación adicional
```

### 2. **Nuevo Archivo: `server/database.ts`**
- Conexión a MongoDB
- Modelos de Mongoose
- Helpers de encriptación

### 3. **Modificar: `server/user-auth.ts`**
- Reemplazar Map/JSON por MongoDB
- Usar modelos de Mongoose

### 4. **Nuevo Archivo: `server/wallet-service.ts`**
- Gestión de wallets por usuario
- Encriptación de private keys
- Aislamiento completo

### 5. **Modificar: `server/index.ts`**
- Todos los endpoints deben usar `req.userId`
- Filtrar por `userId` en todas las queries
- Middleware de autenticación obligatorio

### 6. **Modificar: `src/pumpfun/pumpfun-bot.ts`**
- Cargar wallets desde MongoDB (no desde archivos)
- Filtrar por userId

### 7. **Modificar: Frontend**
- Guardar token JWT en localStorage
- Enviar token en todas las requests
- Manejo de login/logout

---

## 🔐 Seguridad de Private Keys

### Encriptación de Private Keys
```typescript
// Usar clave derivada de password del usuario
const userKey = deriveKeyFromPassword(userPassword, userSalt);
const encryptedKey = encrypt(privateKey, userKey);
```

**Problema**: Si el usuario olvida su password, pierde acceso a sus wallets.

**Solución**: 
- Opción 1: Backup de private keys encriptados con clave maestra
- Opción 2: Permitir exportar private keys (con confirmación)
- Opción 3: Usar hardware wallet para master wallet

---

## 📝 Script de Migración

### Migrar datos existentes de JSON a MongoDB
```typescript
// scripts/migrate-to-mongodb.ts
// Migra usuarios, wallets, etc. desde archivos JSON
```

---

## 🚀 Implementación Paso a Paso

### Fase 1: Setup MongoDB (Día 1)
1. Instalar dependencias
2. Crear `server/database.ts`
3. Configurar conexión
4. Crear modelos básicos

### Fase 2: Migrar Usuarios (Día 2)
1. Modificar `user-auth.ts`
2. Migrar datos existentes
3. Probar login/register

### Fase 3: Sistema de Wallets (Día 3-4)
1. Crear `wallet-service.ts`
2. Implementar encriptación
3. Modificar endpoints de wallets
4. Migrar wallets existentes

### Fase 4: Migrar Portfolio y Trades (Día 5)
1. Modificar portfolio-tracker
2. Modificar stop-loss-manager
3. Modificar price-alerts

### Fase 5: Frontend (Día 6)
1. Implementar login/logout
2. Guardar token
3. Enviar token en requests
4. Manejo de errores de auth

### Fase 6: Testing y Deploy (Día 7)
1. Tests de integración
2. Migración de datos de producción
3. Deploy

---

## ⚠️ Consideraciones Importantes

### 1. **Backward Compatibility**
- Mantener endpoints sin auth temporalmente
- Migración gradual

### 2. **Performance**
- Índices en MongoDB:
  - `users.username` (unique)
  - `users.email` (unique)
  - `wallets.userId` (indexed)
  - `sessions.token` (indexed)
  - `sessions.userId` (indexed)

### 3. **Backup**
- Backup automático de MongoDB
- Backup de private keys encriptados

### 4. **Encriptación**
- Private keys NUNCA en texto plano
- Usar bcrypt para passwords
- Usar AES-256 para private keys

---

## 📊 Variables de Entorno Necesarias

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/pnl-onl
# O para producción:
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pnl-onl

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d

# Encriptación de keys
ENCRYPTION_KEY=your-encryption-key-for-private-keys
```

---

## ✅ Checklist de Implementación

- [ ] Instalar dependencias (mongoose, bcrypt, crypto-js)
- [ ] Crear `server/database.ts` con conexión
- [ ] Crear modelos de Mongoose
- [ ] Modificar `user-auth.ts` para usar MongoDB
- [ ] Crear `wallet-service.ts` con encriptación
- [ ] Modificar todos los endpoints para usar `req.userId`
- [ ] Crear script de migración de datos
- [ ] Modificar frontend para autenticación
- [ ] Tests de integración
- [ ] Documentación de API
- [ ] Deploy y migración de producción

---

## 🎯 Resultado Final

Después de la migración:
- ✅ Cada usuario tiene sus propias wallets
- ✅ Datos persistentes en MongoDB
- ✅ No se pierden datos al actualizar
- ✅ Escalable para múltiples usuarios
- ✅ Private keys encriptados
- ✅ Aislamiento completo entre usuarios

