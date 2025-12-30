# 🚀 Desplegar Backend en Railway - AHORA

## Opción 1: Usar Railway CLI (Recomendado)

### Paso 1: Instalar Railway CLI

```bash
# Si tienes permisos (puede pedir contraseña):
sudo npm install -g @railway/cli

# O usar npx (no requiere instalación global):
npx @railway/cli login
```

### Paso 2: Login

```bash
railway login
```

Esto abrirá tu navegador para autenticarte con Railway.

### Paso 3: Inicializar Proyecto

```bash
cd /Users/g/Desktop/bund
railway init
```

Te preguntará:
- **Create a new project?** → Sí
- **Project name?** → `pnl-backend` (o el nombre que prefieras)

### Paso 4: Configurar Variables

```bash
railway variables set HOST=0.0.0.0
```

### Paso 5: Desplegar

```bash
railway up
```

Esto subirá tu código y desplegará el backend. Puede tomar 2-5 minutos.

### Paso 6: Obtener URL

```bash
railway domain
```

O desde el dashboard:
1. Ve a [railway.app](https://railway.app)
2. Click en tu proyecto
3. Click en el servicio
4. Ve a **Settings → Networking**
5. Click **"Generate Domain"**
6. Copia la URL (ej: `https://pnl-backend-production.up.railway.app`)

---

## Opción 2: Usar Dashboard de Railway (Más Fácil)

### Paso 1: Ir a Railway

Ve a [railway.app](https://railway.app) y haz login.

### Paso 2: Crear Nuevo Proyecto

1. Click **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Autoriza Railway a acceder a GitHub (si es la primera vez)
4. Selecciona el repositorio: `banabets/pnl`
5. Click **"Deploy Now"**

### Paso 3: Configurar el Servicio

Railway detectará automáticamente que es Node.js, pero verifica:

1. Click en el servicio recién creado
2. Ve a **Settings**
3. Verifica:
   - **Start Command**: `npm run start:server`
   - **Root Directory**: `.` (debe estar vacío o `.`)

### Paso 4: Agregar Variables de Entorno

1. Ve a **Variables** (en el menú lateral)
2. Click **"New Variable"**
3. Agrega:
   - **Name**: `HOST`
   - **Value**: `0.0.0.0`
4. Click **"Add"**

### Paso 5: Generar Dominio

1. Ve a **Settings → Networking**
2. Click **"Generate Domain"**
3. Copia la URL (ej: `https://pnl-backend-production.up.railway.app`)

### Paso 6: Verificar Deployment

1. Ve a **Deployments** (en el menú lateral)
2. Espera a que el deployment termine (verás "Active" en verde)
3. Click en el deployment para ver logs
4. Deberías ver: `🚀 Server running on http://0.0.0.0:PORT`

---

## Paso 7: Actualizar Vercel

Una vez que tengas la URL de Railway:

1. Ve a [vercel.com](https://vercel.com)
2. Selecciona tu proyecto `pnl`
3. Ve a **Settings → Environment Variables**
4. Agrega/Actualiza estas variables para **Production**, **Preview**, y **Development**:

   ```
   VITE_API_URL=https://tu-url-railway.railway.app/api
   VITE_SOCKET_URL=https://tu-url-railway.railway.app
   ```

   ⚠️ **Reemplaza** `tu-url-railway.railway.app` con tu URL real de Railway

5. Click **"Save"**
6. Ve a **Deployments** y haz click en **"Redeploy"** en el último deployment
7. O simplemente espera el auto-deploy en el próximo push

---

## Verificar que Todo Funciona

### 1. Probar Backend Directamente

```bash
curl https://tu-url-railway.railway.app/api/health
```

Deberías recibir una respuesta JSON.

### 2. Ver Logs de Railway

```bash
railway logs
```

O desde el dashboard:
- Ve a **Deployments → Click en el último → View Logs**

### 3. Probar desde Frontend

1. Ve a `www.pnl.onl`
2. Abre la consola del navegador (F12)
3. Deberías ver: `✅ Connected to server`
4. NO deberías ver: `❌ Connection error` o `Connection Lost`

---

## Troubleshooting

### El deployment falla
- ✅ Revisa los logs en Railway Dashboard
- ✅ Verifica que `HOST=0.0.0.0` está configurado
- ✅ Asegúrate que `npm run start:server` funciona localmente

### "Connection Lost" en Vercel
- ✅ Verifica que la URL de Railway es correcta (sin trailing slash)
- ✅ Asegúrate que las variables en Vercel están actualizadas
- ✅ Verifica que el backend está corriendo: `curl https://tu-url/api/health`

### Error de CORS
- ✅ El backend ya tiene CORS configurado
- ✅ Verifica que la URL en Vercel usa `https://` (no `http://`)

---

## ✅ Checklist Final

- [ ] Backend desplegado en Railway
- [ ] URL de Railway obtenida
- [ ] Variables de entorno configuradas en Vercel
- [ ] Vercel redeployado
- [ ] Backend responde: `curl https://tu-url/api/health`
- [ ] Frontend se conecta: `www.pnl.onl` muestra "Connected"

---

## 🎉 ¡Listo!

Una vez completado, tu aplicación estará completamente funcional:
- ✅ Frontend: `www.pnl.onl` (Vercel CDN)
- ✅ Backend: `tu-url.railway.app` (Railway)
- ✅ Socket.IO funcionando
- ✅ Todas las APIs funcionando


