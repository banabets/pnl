# ✅ Paso 1 Completado: Instalación y Configuración Base MongoDB

## 🎉 Lo que hemos hecho:

### 1. ✅ Dependencias Instaladas
- `mongoose@^8.0.0` - ODM para MongoDB
- `bcrypt@^5.1.1` - Encriptación de passwords
- `crypto-js@^4.2.0` - Encriptación adicional
- `@types/bcrypt` y `@types/crypto-js` - Tipos TypeScript

### 2. ✅ Archivos Creados
- `server/database.ts` - Modelos MongoDB completos
- `server/wallet-service.ts` - Servicio de wallets con encriptación
- `.env.example` - Template de variables de entorno

### 3. ✅ Código Modificado
- `server/index.ts` - Conexión MongoDB agregada
- `server/user-auth.ts` - Métodos `register()` y `login()` actualizados para MongoDB
- `server/user-auth.ts` - Métodos `createSession()` y `logActivity()` actualizados
- Endpoints de auth actualizados para usar `await`

## 📊 Estado Actual

### Funcional con MongoDB:
- ✅ Registro de usuarios
- ✅ Login de usuarios
- ✅ Creación de sesiones
- ✅ Logging de actividad

### Fallback a JSON (si MongoDB no está disponible):
- ✅ Sistema sigue funcionando con archivos JSON
- ✅ Migración gradual sin romper funcionalidad

## 🔧 Configuración Necesaria

### 1. Crear archivo `.env`:
```bash
cp .env.example .env
```

### 2. Editar `.env` con tus valores:
```env
MONGODB_URI=mongodb://localhost:27017/pnl-onl
JWT_SECRET=tu-secret-key-aqui
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 3. Instalar MongoDB (si no lo tienes):

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**O usar MongoDB Atlas (recomendado):**
1. Crear cuenta en https://www.mongodb.com/cloud/atlas
2. Crear cluster gratuito
3. Obtener connection string
4. Agregar a `.env`

## 🧪 Probar

### 1. Iniciar servidor:
```bash
npm run dev:web
```

Deberías ver:
```
✅ Connected to MongoDB
📊 Using MongoDB for user data
🚀 Server running on http://0.0.0.0:3001
```

### 2. Probar registro:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"test1234"}'
```

### 3. Probar login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"testuser","password":"test1234"}'
```

## ⏭️ Próximos Pasos

### Paso 2: Completar Migración de user-auth.ts
- [ ] Actualizar `verifyToken()` para MongoDB
- [ ] Actualizar `getUserById()` para MongoDB
- [ ] Actualizar `getUserByToken()` para MongoDB
- [ ] Actualizar `updateProfile()` para MongoDB
- [ ] Actualizar `updateSettings()` para MongoDB
- [ ] Actualizar `changePassword()` para MongoDB
- [ ] Actualizar `logout()` para MongoDB

### Paso 3: Integrar wallet-service
- [ ] Modificar endpoint `/api/wallets` para usar `walletService`
- [ ] Modificar endpoint `/api/wallets/generate` para usar `walletService`
- [ ] Modificar endpoint `/api/master-wallet` para usar `walletService`

### Paso 4: Aislamiento por Usuario
- [ ] Agregar `authenticateToken` a todos los endpoints
- [ ] Filtrar por `req.userId` en todas las queries

## 📝 Notas

- El sistema funciona con MongoDB cuando está disponible
- Si MongoDB no está disponible, usa JSON files como fallback
- Esto permite migración gradual sin romper funcionalidad existente
- Los usuarios existentes en JSON se pueden migrar después

## 🐛 Troubleshooting

### Error: "MongoServerError: Authentication failed"
- Verifica que `MONGODB_URI` tiene usuario y password correctos
- Verifica que el usuario tiene permisos en la base de datos

### Error: "Cannot connect to MongoDB"
- Verifica que MongoDB está corriendo: `mongosh`
- Verifica que `MONGODB_URI` es correcto
- Para Atlas, verifica IP whitelist

### Sistema usa JSON en lugar de MongoDB
- Verifica que MongoDB está conectado
- Revisa logs del servidor
- Verifica variable `MONGODB_URI` en `.env`

---

**¿Listo para continuar con el Paso 2?** 🚀

