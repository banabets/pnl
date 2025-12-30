# ✅ Verificar Variables de Entorno en Vercel

## Variables Configuradas

Según lo que veo, tienes:
- ✅ `VITE_API_URL` configurada
- ✅ `VITE_SOCKET_URL` configurada

## 🔍 Verificar Valores Correctos

### Paso 1: Verificar en Vercel Dashboard

1. Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**
2. Click en cada variable para ver su valor (o editar)

### Paso 2: Valores Esperados

Las variables deberían tener estos valores exactos:

#### `VITE_API_URL`
```
https://web-production-a1176.up.railway.app/api
```

⚠️ **Importante**: 
- Debe terminar en `/api`
- No debe tener trailing slash adicional
- Debe usar `https://` (no `http://`)

#### `VITE_SOCKET_URL`
```
https://web-production-a1176.up.railway.app
```

⚠️ **Importante**:
- NO debe terminar en `/api`
- NO debe tener trailing slash
- Debe usar `https://` (no `http://`)

### Paso 3: Verificar Environments

Asegúrate de que ambas variables estén marcadas para:
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

## 🔄 Si Necesitas Cambiar los Valores

1. Click en la variable que quieres editar
2. Cambia el valor
3. Click **"Save"**
4. Ve a **Deployments**
5. Click en los **3 puntos** (⋯) del último deployment
6. Click **"Redeploy"**

## ✅ Verificar que Funciona

### Después del Redeploy (espera 2-3 minutos):

1. Ve a `www.pnl.onl`
2. Abre la consola del navegador (F12)
3. Deberías ver:
   ```
   🔌 API URL: https://web-production-a1176.up.railway.app/api
   🔌 Using VITE_SOCKET_URL: https://web-production-a1176.up.railway.app
   ✅ Connected to server
   ```

### Si Ves Errores:

- `🔌 Connecting to Socket.IO server: https://pnl.onl` → Variables no configuradas correctamente
- `❌ Connection error` → Verifica que el backend esté corriendo
- `503 errors` → Backend puede estar reiniciando, espera 1-2 minutos

## 🎯 Checklist Final

- [ ] `VITE_API_URL` = `https://web-production-a1176.up.railway.app/api`
- [ ] `VITE_SOCKET_URL` = `https://web-production-a1176.up.railway.app`
- [ ] Ambas variables marcadas para Production, Preview, Development
- [ ] Redeploy hecho después de configurar
- [ ] Esperado 2-3 minutos después del redeploy
- [ ] Consola muestra URLs correctas
- [ ] Socket.IO conectado correctamente


