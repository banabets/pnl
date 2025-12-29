# 🔧 Configurar Variables de Entorno en Vercel

## ✅ Backend Desplegado en Railway

**URL del Backend:** `https://web-production-a1176.up.railway.app`

---

## 📋 Pasos para Configurar Vercel

### 1. Ir a Vercel Dashboard

1. Ve a [vercel.com](https://vercel.com)
2. Selecciona tu proyecto `pnl`
3. Ve a **Settings → Environment Variables**

### 2. Agregar/Actualizar Variables

Agrega estas **2 variables** para **Production**, **Preview**, y **Development**:

#### Variable 1: `VITE_API_URL`
- **Name**: `VITE_API_URL`
- **Value**: `https://web-production-a1176.up.railway.app/api`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### Variable 2: `VITE_SOCKET_URL`
- **Name**: `VITE_SOCKET_URL`
- **Value**: `https://web-production-a1176.up.railway.app`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 3. Guardar y Redeploy

1. Click **"Save"** después de agregar cada variable
2. Ve a **Deployments**
3. Click en los **3 puntos** (⋯) del último deployment
4. Click **"Redeploy"**
5. O simplemente espera el auto-deploy en el próximo push

---

## ✅ Verificar Configuración

### 1. Verificar Backend

```bash
curl https://web-production-a1176.up.railway.app/api/health
```

Deberías recibir una respuesta JSON.

### 2. Verificar Frontend

1. Ve a `www.pnl.onl`
2. Abre la consola del navegador (F12)
3. Deberías ver: `✅ Connected to server`
4. NO deberías ver: `❌ Connection error` o `Connection Lost`

### 3. Verificar Variables en Vercel

En Vercel Dashboard → Settings → Environment Variables, deberías ver:

```
VITE_API_URL = https://web-production-a1176.up.railway.app/api
VITE_SOCKET_URL = https://web-production-a1176.up.railway.app
```

---

## 🔍 Troubleshooting

### "Connection Lost" aún aparece
- ✅ Verifica que las variables están guardadas en Vercel
- ✅ Asegúrate de hacer redeploy después de agregar variables
- ✅ Verifica que el backend está corriendo: `curl https://web-production-a1176.up.railway.app/api/health`
- ✅ Revisa la consola del navegador para ver errores específicos

### CORS Errors
- ✅ El backend ya tiene CORS configurado
- ✅ Verifica que las URLs usan `https://` (no `http://`)
- ✅ No agregues trailing slash (`/`) al final de las URLs

### Variables no se aplican
- ✅ Asegúrate de seleccionar todos los environments (Production, Preview, Development)
- ✅ Haz redeploy después de agregar variables
- ✅ Verifica que los nombres son exactamente: `VITE_API_URL` y `VITE_SOCKET_URL`

---

## 🎉 ¡Listo!

Una vez configurado:
- ✅ Frontend: `www.pnl.onl` (Vercel)
- ✅ Backend: `https://web-production-a1176.up.railway.app` (Railway)
- ✅ Socket.IO funcionando
- ✅ Todas las APIs funcionando

