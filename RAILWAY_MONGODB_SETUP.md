# 🚂 Configuración MongoDB en Railway

## Opción 1: MongoDB Atlas (Recomendado) ⭐

MongoDB Atlas es gratuito y más fácil de configurar. Railway puede conectarse a Atlas sin problemas.

### Pasos:

1. **Crear cuenta en MongoDB Atlas**
   - Ve a https://www.mongodb.com/cloud/atlas
   - Crea una cuenta gratuita
   - Crea un nuevo proyecto

2. **Crear Cluster**
   - Click en "Build a Database"
   - Selecciona "FREE" (M0)
   - Selecciona región (cerca de donde está tu Railway app)
   - Click "Create"

3. **Configurar Acceso**
   - **Database Access**: Crear usuario de base de datos
     - Username: `pnl-onl-user`
     - Password: Genera una segura
     - Database User Privileges: "Read and write to any database"
   
   - **Network Access**: Agregar IP
     - Click "Add IP Address"
     - Click "Allow Access from Anywhere" (0.0.0.0/0)
     - O agrega la IP de Railway si la conoces

4. **Obtener Connection String**
   - Click "Connect" en tu cluster
   - Selecciona "Connect your application"
   - Copia el connection string
   - Reemplaza `<password>` con tu password
   - Reemplaza `<dbname>` con `pnl-onl` (opcional)

   Ejemplo:
   ```
   mongodb+srv://pnl-onl-user:TU_PASSWORD@cluster0.xxxxx.mongodb.net/pnl-onl?retryWrites=true&w=majority
   ```

5. **Agregar a Railway**
   - Ve a tu proyecto en Railway
   - Click en "Variables"
   - Agrega nueva variable:
     - **Key**: `MONGODB_URI`
     - **Value**: Tu connection string completo
   - Click "Add"

---

## Opción 2: MongoDB Plugin de Railway

Railway tiene un plugin de MongoDB que puedes instalar directamente.

### Pasos:

1. **En tu proyecto Railway**
   - Click en "New" → "Database" → "Add MongoDB"
   - Railway creará una instancia de MongoDB automáticamente

2. **Obtener Connection String**
   - Railway generará automáticamente la variable `MONGO_URL` o `MONGODB_URI`
   - Se agregará automáticamente a tus variables de entorno

3. **Verificar**
   - Ve a "Variables" en tu proyecto
   - Deberías ver `MONGODB_URI` o `MONGO_URL`
   - Copia el valor

---

## Configuración en el Código

### Actualizar `server/database.ts`

El código ya está preparado para leer `MONGODB_URI`:

```typescript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pnl-onl';
```

Railway automáticamente inyecta las variables de entorno, así que solo necesitas:

1. Agregar `MONGODB_URI` en Railway Variables
2. El código lo leerá automáticamente

---

## Variables de Entorno en Railway

Agrega estas variables en Railway:

### Obligatorias:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pnl-onl
JWT_SECRET=tu-secret-key-super-segura-aqui
ENCRYPTION_KEY=tu-64-char-hex-key-aqui
```

### Opcionales:
```
RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_KEY
PORT=3001
HOST=0.0.0.0
```

---

## Generar ENCRYPTION_KEY

En tu terminal local:

```bash
openssl rand -hex 32
```

Copia el resultado (64 caracteres) y úsalo como `ENCRYPTION_KEY` en Railway.

---

## Verificar Conexión

### 1. Deploy en Railway
- Push a GitHub (si tienes auto-deploy)
- O manual: `railway up`

### 2. Ver Logs
- En Railway, ve a "Deployments"
- Click en el último deployment
- Verifica logs, deberías ver:
  ```
  ✅ Connected to MongoDB
  📊 Using MongoDB for user data
  ```

### 3. Probar Endpoint
```bash
curl https://tu-app.railway.app/api/health
```

---

## Troubleshooting

### Error: "MongoServerError: Authentication failed"
- Verifica que el password en `MONGODB_URI` es correcto
- Verifica que el usuario tiene permisos

### Error: "MongoNetworkError: connection timeout"
- Verifica que la IP whitelist en Atlas incluye `0.0.0.0/0`
- O agrega la IP de Railway

### Error: "ENCRYPTION_KEY must be 32 bytes"
- Genera nuevo key: `openssl rand -hex 32`
- Debe ser exactamente 64 caracteres hex

### No se conecta a MongoDB
- Verifica que `MONGODB_URI` está en Railway Variables
- Verifica que el formato es correcto
- Revisa logs de Railway

---

## Recomendación Final

**Usa MongoDB Atlas** porque:
- ✅ Gratis hasta 512MB
- ✅ Más fácil de configurar
- ✅ Mejor para producción
- ✅ Backup automático
- ✅ Monitoring incluido

Railway MongoDB Plugin es bueno para desarrollo rápido, pero Atlas es mejor para producción.

---

## Checklist

- [ ] Cuenta MongoDB Atlas creada
- [ ] Cluster creado
- [ ] Usuario de base de datos creado
- [ ] IP whitelist configurada (0.0.0.0/0)
- [ ] Connection string obtenido
- [ ] `MONGODB_URI` agregado a Railway Variables
- [ ] `JWT_SECRET` agregado a Railway Variables
- [ ] `ENCRYPTION_KEY` generado y agregado
- [ ] App deployada en Railway
- [ ] Logs verificados (debe decir "Connected to MongoDB")
- [ ] Endpoint `/api/health` probado

---

¡Listo! Tu app debería conectarse a MongoDB automáticamente cuando se despliegue en Railway. 🚀

