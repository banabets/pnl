# 🚂 MongoDB Directo en Railway (Sin Atlas)

## ✅ Sí, Railway tiene MongoDB Plugin

Puedes instalar MongoDB directamente en Railway sin necesidad de Atlas.

---

## 📋 Pasos para Agregar MongoDB en Railway

### Opción 1: Desde el Dashboard de Railway

1. **Ve a tu proyecto en Railway**
   - https://railway.app/dashboard

2. **Click en "New"**
   - En la parte superior derecha

3. **Selecciona "Database"**
   - Verás varias opciones de bases de datos

4. **Click en "Add MongoDB"**
   - Railway creará una instancia de MongoDB automáticamente

5. **Espera a que se cree**
   - Railway configurará todo automáticamente
   - Toma 1-2 minutos

6. **Obtener Connection String**
   - Click en el servicio MongoDB que acabas de crear
   - Ve a la pestaña "Variables"
   - Busca `MONGO_URL` o `MONGODB_URI`
   - Copia el valor completo

7. **Conectar a tu App**
   - Ve a tu servicio de aplicación (no el MongoDB)
   - Click en "Variables"
   - Agrega nueva variable:
     - **Key**: `MONGODB_URI`
     - **Value**: El `MONGO_URL` que copiaste del servicio MongoDB
   - O Railway puede hacerlo automáticamente si están en el mismo proyecto

---

### Opción 2: Desde Railway CLI

```bash
# Instalar Railway CLI (si no lo tienes)
npm i -g @railway/cli

# Login
railway login

# En tu proyecto
railway link

# Agregar MongoDB
railway add mongodb

# Ver variables
railway variables
```

---

## 🔧 Configuración Automática

Railway automáticamente:
- ✅ Crea la instancia de MongoDB
- ✅ Genera usuario y password
- ✅ Crea la variable `MONGO_URL` o `MONGODB_URI`
- ✅ La expone a otros servicios en el mismo proyecto

**Tu código ya está listo** porque `server/database.ts` lee:
```typescript
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/pnl-onl';
```

---

## 📊 Estructura en Railway

Después de agregar MongoDB, tendrás:

```
Tu Proyecto Railway
├── 🚂 Tu App (Web Service)
│   └── Variables:
│       ├── MONGODB_URI (automático)
│       ├── JWT_SECRET (agregar manualmente)
│       └── ENCRYPTION_KEY (agregar manualmente)
│
└── 🗄️ MongoDB (Database Service)
    └── Variables:
        └── MONGO_URL (automático)
```

---

## ✅ Variables que Necesitas Agregar Manualmente

En tu servicio de aplicación, agrega:

1. **JWT_SECRET**
   - Key: `JWT_SECRET`
   - Value: Cualquier string largo y seguro (mínimo 32 caracteres)

2. **ENCRYPTION_KEY**
   - Key: `ENCRYPTION_KEY`
   - Value: Genera con `openssl rand -hex 32` (64 caracteres hex)

**MONGODB_URI se agrega automáticamente** cuando agregas el servicio MongoDB.

---

## 🧪 Verificar que Funciona

1. **Deploy tu app**
   - Railway automáticamente conectará a MongoDB

2. **Ver Logs**
   - Ve a tu servicio de app
   - Click en "Deployments" → Último deployment → "View Logs"
   - Deberías ver:
     ```
     ✅ Connected to MongoDB
     📊 Using MongoDB for user data
     ```

3. **Probar Endpoint**
   ```bash
   curl https://tu-app.railway.app/api/health
   ```

---

## 💰 Costos

- **Railway MongoDB**: Depende del plan de Railway
  - Free tier: Limitado
  - Pro plan: Incluido con límites
  - Ver pricing en railway.app

- **MongoDB Atlas**: 
  - FREE tier: 512MB gratis para siempre
  - Mejor para producción

---

## 🎯 Recomendación

**Para desarrollo/pruebas**: Usa MongoDB de Railway (más fácil)
**Para producción**: Usa MongoDB Atlas (más confiable, gratis)

---

## 🐛 Troubleshooting

### No veo MONGO_URL en Variables
- Verifica que el servicio MongoDB está en el mismo proyecto
- Railway a veces tarda en propagar variables
- Intenta hacer redeploy

### "Cannot connect to MongoDB"
- Verifica que `MONGODB_URI` está en las variables de tu app
- Verifica que el servicio MongoDB está corriendo
- Revisa logs del servicio MongoDB

### Variables no se conectan automáticamente
- Agrega manualmente `MONGODB_URI` en tu servicio de app
- Copia el valor de `MONGO_URL` del servicio MongoDB

---

## ✅ Checklist

- [ ] Servicio MongoDB agregado en Railway
- [ ] `MONGO_URL` visible en variables del MongoDB service
- [ ] `MONGODB_URI` agregado en variables de tu app (o automático)
- [ ] `JWT_SECRET` agregado manualmente
- [ ] `ENCRYPTION_KEY` agregado manualmente
- [ ] App deployada
- [ ] Logs verificados (debe decir "Connected to MongoDB")

---

**¡Listo!** Puedes usar MongoDB directamente en Railway sin necesidad de Atlas. 🚀

