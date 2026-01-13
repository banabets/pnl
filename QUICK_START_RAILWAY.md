# ⚡ Quick Start: MongoDB en Railway

## 🎯 Opción Más Rápida: MongoDB Atlas

### 1. Crear MongoDB Atlas (5 minutos)

1. Ve a https://www.mongodb.com/cloud/atlas/register
2. Crea cuenta gratuita
3. Crea cluster FREE (M0)
4. Crea usuario de DB:
   - Username: `pnluser`
   - Password: Genera una segura (guárdala)
5. Network Access: Click "Allow Access from Anywhere" (0.0.0.0/0)
6. Click "Connect" → "Connect your application"
7. Copia el connection string

### 2. Configurar Railway (2 minutos)

1. Ve a tu proyecto en Railway
2. Click "Variables"
3. Agrega estas variables:

```
MONGODB_URI=mongodb+srv://pnluser:TU_PASSWORD@cluster0.xxxxx.mongodb.net/pnl-onl?retryWrites=true&w=majority
JWT_SECRET=tu-secret-key-minimo-32-caracteres-aqui
ENCRYPTION_KEY=genera-con-openssl-rand-hex-32
```

**Para generar ENCRYPTION_KEY:**
```bash
openssl rand -hex 32
```

### 3. Deploy

Railway automáticamente:
- ✅ Lee `MONGODB_URI` de las variables
- ✅ Se conecta a MongoDB
- ✅ Tu app funciona

### 4. Verificar

En los logs de Railway deberías ver:
```
✅ Connected to MongoDB
📊 Using MongoDB for user data
🚀 Server running on http://0.0.0.0:3001
```

---

## 🔧 Si Prefieres MongoDB Plugin de Railway

1. En Railway: "New" → "Database" → "Add MongoDB"
2. Railway crea automáticamente `MONGO_URL` o `MONGODB_URI`
3. Verifica en "Variables" que existe
4. Si se llama `MONGO_URL`, actualiza `server/database.ts`:

```typescript
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/pnl-onl';
```

---

## ✅ Checklist Rápido

- [ ] MongoDB Atlas creado
- [ ] Connection string copiado
- [ ] Variables agregadas en Railway:
  - [ ] `MONGODB_URI`
  - [ ] `JWT_SECRET`
  - [ ] `ENCRYPTION_KEY`
- [ ] App deployada
- [ ] Logs verificados

---

## 🐛 Problemas Comunes

**"Cannot connect to MongoDB"**
→ Verifica que `MONGODB_URI` está en Railway Variables

**"Authentication failed"**
→ Verifica password en connection string

**"Connection timeout"**
→ Verifica IP whitelist en Atlas (debe incluir 0.0.0.0/0)

---

**¡Eso es todo!** Tu app debería funcionar con MongoDB en Railway. 🚀


