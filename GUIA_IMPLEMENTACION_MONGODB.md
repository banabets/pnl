# 🚀 Guía Paso a Paso: Implementación MongoDB Multi-Usuario

## 📋 Prerrequisitos

1. Node.js 18+ instalado
2. MongoDB instalado localmente O cuenta de MongoDB Atlas (recomendado)
3. Git (para versionar cambios)

---

## Paso 1: Instalar Dependencias

```bash
cd /Users/g/Desktop/bund
npm install mongoose @types/mongoose
npm install bcrypt @types/bcrypt
npm install crypto-js @types/crypto-js
```

**O actualiza `package.json`** y luego `npm install`:

```json
{
  "dependencies": {
    "mongoose": "^8.0.0",
    "bcrypt": "^5.1.1",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/mongoose": "^5.11.97",
    "@types/bcrypt": "^5.0.2",
    "@types/crypto-js": "^4.2.1"
  }
}
```

---

## Paso 2: Configurar MongoDB

### Opción A: MongoDB Local

1. **Instalar MongoDB**:
   ```bash
   # macOS
   brew install mongodb-community
   brew services start mongodb-community
   ```

2. **Verificar que está corriendo**:
   ```bash
   mongosh
   ```

3. **Crear base de datos**:
   ```javascript
   use pnl-onl
   ```

### Opción B: MongoDB Atlas (Recomendado para producción)

1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crear cluster gratuito
3. Obtener connection string
4. Configurar IP whitelist
5. Crear usuario de base de datos

---

## Paso 3: Configurar Variables de Entorno

Crea o actualiza `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/pnl-onl
# O para Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pnl-onl

# JWT (ya deberías tener esto)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d

# Encriptación de private keys
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**⚠️ IMPORTANTE**: 
- `ENCRYPTION_KEY` debe ser exactamente 32 caracteres (64 hex)
- Genera uno seguro: `openssl rand -hex 32`
- **NUNCA** compartas este key

---

## Paso 4: Modificar `server/index.ts`

Agrega al inicio del archivo (después de los imports):

```typescript
// MongoDB Connection
import { connectDatabase, isConnected } from './database';

// Conectar a MongoDB al iniciar
connectDatabase().catch((error) => {
  console.error('❌ Failed to connect to MongoDB:', error);
  process.exit(1);
});

// Verificar conexión antes de iniciar servidor
if (!isConnected()) {
  console.warn('⚠️ MongoDB not connected, some features may not work');
}
```

---

## Paso 5: Modificar Endpoints para Usar `req.userId`

### Ejemplo: Endpoint de Wallets

**ANTES** (sin usuario):
```typescript
app.get('/api/wallets', async (req, res) => {
  // Carga wallets desde archivos
  const wallets = walletManager.loadKeypairs();
  res.json({ wallets });
});
```

**DESPUÉS** (con usuario):
```typescript
import { authenticateToken } from './auth-middleware';
import { walletService } from './wallet-service';

app.get('/api/wallets', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const wallets = await walletService.getUserWallets(req.userId);
  res.json({ wallets });
});
```

### Ejemplo: Endpoint de PumpFun

**ANTES**:
```typescript
app.post('/api/pumpfun/execute', async (req, res) => {
  // Usa wallets globales
  await pumpFunBot.initialize();
  const result = await pumpFunBot.executePump(config);
});
```

**DESPUÉS**:
```typescript
app.post('/api/pumpfun/execute', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const config = req.body;
  const wallets = await walletService.getWalletsWithKeys(req.userId, config.selectedWalletIndices);
  
  // Usar wallets del usuario
  const result = await executePumpForUser(req.userId, wallets, config);
});
```

---

## Paso 6: Modificar `src/pumpfun/pumpfun-bot.ts`

**Cambiar** el método `initialize()` para aceptar wallets:

```typescript
// ANTES
public async initialize(): Promise<void> {
  // Carga desde keypairs/
  const keypairs = this.loadKeypairsFromFiles();
  this.wallets = keypairs;
}

// DESPUÉS
public async initialize(wallets: Keypair[]): Promise<void> {
  this.wallets = wallets;
}
```

---

## Paso 7: Crear Script de Migración

Crea `scripts/migrate-to-mongodb.ts`:

```typescript
import { connectDatabase } from '../server/database';
import { User, Wallet, MasterWallet } from '../server/database';
import fs from 'fs';
import path from 'path';

async function migrate() {
  await connectDatabase();
  
  // Migrar usuarios desde JSON
  const usersFile = path.join(__dirname, '../data/users.json');
  if (fs.existsSync(usersFile)) {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    for (const user of users) {
      await User.findOneAndUpdate(
        { id: user.id },
        user,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Migrated ${users.length} users`);
  }
  
  // Migrar wallets desde keypairs/
  // (Necesitarás asociar wallets a usuarios)
  
  console.log('✅ Migration complete');
  process.exit(0);
}

migrate().catch(console.error);
```

Ejecutar:
```bash
ts-node scripts/migrate-to-mongodb.ts
```

---

## Paso 8: Modificar Frontend para Autenticación

### 8.1 Crear componente de Login

Crea `web/src/components/Login.tsx`:

```typescript
import { useState } from 'react';
import api from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await api.post(endpoint, { username, password });
      
      if (res.data.token) {
        localStorage.setItem('authToken', res.data.token);
        window.location.reload();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form onSubmit={handleSubmit} className="bg-black border border-white/15 p-8 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">
          {isLogin ? 'Login' : 'Register'}
        </h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2 bg-black border border-white/15 text-white rounded mb-4"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 bg-black border border-white/15 text-white rounded mb-4"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-white text-black rounded font-semibold"
        >
          {isLogin ? 'Login' : 'Register'}
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-2 text-white/60 text-sm"
        >
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </form>
    </div>
  );
}
```

### 8.2 Modificar `web/src/utils/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// Agregar token a todas las requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 8.3 Modificar `web/src/App.tsx`

```typescript
import { useState, useEffect } from 'react';
import Login from './components/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verificar token
      api.get('/auth/me')
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Resto del código...
}
```

---

## Paso 9: Testing

### 9.1 Probar Conexión MongoDB

```bash
npm run dev:web
# Deberías ver: "✅ Connected to MongoDB"
```

### 9.2 Probar Registro de Usuario

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"test1234"}'
```

### 9.3 Probar Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test1234"}'
```

### 9.4 Probar Wallets (con token)

```bash
TOKEN="tu-token-aqui"
curl -X GET http://localhost:3001/api/wallets \
  -H "Authorization: Bearer $TOKEN"
```

---

## Paso 10: Deploy

### 10.1 Variables de Entorno en Producción

En Railway/Render/Fly.io, agrega:
- `MONGODB_URI`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

### 10.2 MongoDB Atlas

1. Crea cluster en Atlas
2. Obtén connection string
3. Configura IP whitelist (0.0.0.0/0 para Railway)
4. Agrega `MONGODB_URI` en variables de entorno

---

## ✅ Checklist Final

- [ ] Dependencias instaladas
- [ ] MongoDB configurado (local o Atlas)
- [ ] Variables de entorno configuradas
- [ ] `server/database.ts` creado
- [ ] `server/wallet-service.ts` creado
- [ ] `server/index.ts` modificado para usar MongoDB
- [ ] Endpoints modificados para usar `req.userId`
- [ ] Frontend modificado para autenticación
- [ ] Script de migración ejecutado
- [ ] Tests realizados
- [ ] Deploy a producción

---

## 🐛 Troubleshooting

### Error: "MongoServerError: Authentication failed"
- Verifica `MONGODB_URI` tiene usuario y password correctos
- Verifica que el usuario tiene permisos en la base de datos

### Error: "Cannot find module 'mongoose'"
- Ejecuta `npm install mongoose @types/mongoose`

### Error: "ENCRYPTION_KEY must be 32 bytes"
- Genera nuevo key: `openssl rand -hex 32`
- Actualiza `.env`

### Wallets no aparecen
- Verifica que estás autenticado (token en localStorage)
- Verifica que `req.userId` está presente en el endpoint
- Revisa logs del servidor

---

## 📚 Recursos

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

## 🎯 Próximos Pasos

Después de implementar MongoDB:
1. ✅ Encriptación mejorada de private keys
2. ✅ Sistema de logging (Winston)
3. ✅ Validación de inputs (Zod)
4. ✅ Tests unitarios
5. ✅ Refactorización de código

---

¡Éxito con la implementación! 🚀


