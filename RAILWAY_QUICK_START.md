# 🚀 Railway Quick Start Guide

## Paso 1: Instalar Railway CLI (Opcional pero Recomendado)

```bash
npm install -g @railway/cli
```

## Paso 2: Login a Railway

```bash
railway login
```

Esto abrirá tu navegador para autenticarte.

## Paso 3: Inicializar Proyecto

```bash
cd /Users/g/Desktop/bund
railway init
```

Esto creará un nuevo proyecto en Railway o te permitirá vincular uno existente.

## Paso 4: Configurar Variables de Entorno

```bash
# Railway configurará PORT automáticamente, pero puedes agregar:
railway variables set HOST=0.0.0.0
```

O desde el Dashboard:
1. Ve a tu proyecto en Railway
2. Click en el servicio
3. Ve a **Variables**
4. Agrega: `HOST=0.0.0.0`

## Paso 5: Desplegar

```bash
railway up
```

Esto subirá tu código y desplegará el backend.

## Paso 6: Obtener la URL del Backend

```bash
railway domain
```

O desde el Dashboard:
1. Ve a tu servicio
2. Click en **Settings**
3. Ve a **Networking**
4. Click **"Generate Domain"** (si no está generado)
5. Copia la URL (ej: `https://tu-app.railway.app`)

## Paso 7: Actualizar Vercel

1. Ve a **Vercel Dashboard → Tu Proyecto → Settings → Environment Variables**
2. Agrega/Actualiza:
   ```
   VITE_API_URL=https://tu-app.railway.app/api
   VITE_SOCKET_URL=https://tu-app.railway.app
   ```
3. Redeploy Vercel (o espera auto-deploy)

## Verificar que Funciona

```bash
# Ver logs en tiempo real
railway logs

# Probar el backend
curl https://tu-app.railway.app/api/health
```

## Comandos Útiles

```bash
# Ver logs
railway logs

# Ver estado
railway status

# Abrir dashboard
railway open

# Ver variables de entorno
railway variables

# Ver dominio
railway domain
```

## Troubleshooting

### El servidor no inicia
- Verifica logs: `railway logs`
- Asegúrate que `HOST=0.0.0.0` está configurado
- Railway configura `PORT` automáticamente

### Error de conexión desde frontend
- Verifica que la URL de Railway es correcta
- Asegúrate que las variables en Vercel están actualizadas
- Prueba el backend directamente: `curl https://tu-app.railway.app/api/health`

### TypeScript errors
- Railway usa `ts-node` directamente, no necesita compilar
- Si hay errores, revísalos localmente primero: `npm run start:server`

## Alternativa: Usar Dashboard de Railway

Si prefieres no usar CLI:

1. Ve a [railway.app](https://railway.app)
2. Click **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Elige tu repositorio: `banabets/pnl`
5. Railway detectará automáticamente que es Node.js
6. Configura:
   - **Start Command**: `npm run start:server`
   - **Root Directory**: `.`
7. Agrega variable: `HOST=0.0.0.0`
8. Railway desplegará automáticamente

## ¡Listo! 🎉

Tu backend debería estar corriendo en Railway. Ahora solo necesitas:
1. ✅ Copiar la URL de Railway
2. ✅ Actualizar variables en Vercel
3. ✅ Probar la conexión desde `www.pnl.onl`


