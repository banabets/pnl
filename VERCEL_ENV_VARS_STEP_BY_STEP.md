# 📝 Cómo Agregar Variables de Entorno en Vercel - Paso a Paso

## 🎯 Variables que Necesitas Agregar

```
VITE_API_URL=https://web-production-a1176.up.railway.app/api
VITE_SOCKET_URL=https://web-production-a1176.up.railway.app
```

---

## 📋 Pasos Detallados

### Paso 1: Ir a Vercel Dashboard

1. Ve a [vercel.com](https://vercel.com)
2. Haz login con tu cuenta
3. Selecciona tu proyecto `pnl` (o el nombre que tenga)

### Paso 2: Ir a Settings

1. En la parte superior del proyecto, verás varias pestañas:
   - **Overview** | **Deployments** | **Analytics** | **Settings** | etc.
2. Click en **"Settings"**

### Paso 3: Ir a Environment Variables

1. En el menú lateral izquierdo (dentro de Settings), verás:
   - General
   - Environment Variables ← **Click aquí**
   - Git
   - Domains
   - etc.

### Paso 4: Agregar Primera Variable

1. Verás un botón **"Add New"** o **"Create Environment Variable"**
2. Click en ese botón

3. Se abrirá un formulario con 3 campos:
   - **Key** (Nombre de la variable)
   - **Value** (Valor de la variable)
   - **Environments** (Dónde aplica)

4. Para la **primera variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://web-production-a1176.up.railway.app/api`
   - **Environments**: Marca las 3 casillas:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

5. Click en **"Save"** o **"Add"**

### Paso 5: Agregar Segunda Variable

1. Click en **"Add New"** o **"Create Environment Variable"** otra vez

2. Para la **segunda variable**:
   - **Key**: `VITE_SOCKET_URL`
   - **Value**: `https://web-production-a1176.up.railway.app`
   - **Environments**: Marca las 3 casillas:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. Click en **"Save"** o **"Add"**

### Paso 6: Verificar

Deberías ver una tabla con tus 2 variables:

| Key | Value | Environments |
|-----|-------|--------------|
| `VITE_API_URL` | `https://web-production-a1176.up.railway.app/api` | Production, Preview, Development |
| `VITE_SOCKET_URL` | `https://web-production-a1176.up.railway.app` | Production, Preview, Development |

---

## 🔄 Paso 7: Redeploy (IMPORTANTE)

**⚠️ CRÍTICO**: Después de agregar variables, debes hacer redeploy para que se apliquen.

### Opción A: Redeploy Manual

1. Ve a la pestaña **"Deployments"** (arriba)
2. Encuentra el último deployment
3. Click en los **3 puntos** (⋯) a la derecha
4. Click en **"Redeploy"**
5. Confirma el redeploy

### Opción B: Auto-deploy (Esperar)

- Si tienes auto-deploy configurado, Vercel redeployará automáticamente en el próximo push a GitHub
- Pero es mejor hacer redeploy manual para aplicar los cambios inmediatamente

---

## ✅ Verificar que Funciona

### 1. Espera 2-3 minutos después del redeploy

### 2. Ve a tu sitio

Visita: `www.pnl.onl` (o tu dominio de Vercel)

### 3. Abre la Consola del Navegador

- Presiona `F12` o `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Ve a la pestaña **"Console"**

### 4. Deberías Ver

```
✅ Connected to server
```

### 5. NO Deberías Ver

```
❌ Connection error
Connection Lost
```

---

## 🖼️ Imágenes de Referencia

### Ubicación de Settings
```
Vercel Dashboard
  └── Tu Proyecto (pnl)
      └── Settings (pestaña superior)
          └── Environment Variables (menú lateral)
```

### Formulario de Variable
```
┌─────────────────────────────────────┐
│ Create Environment Variable         │
├─────────────────────────────────────┤
│ Key: [VITE_API_URL            ]     │
│ Value: [https://...railway.app/api] │
│                                     │
│ Environments:                       │
│ ☑ Production                       │
│ ☑ Preview                          │
│ ☑ Development                      │
│                                     │
│ [Cancel]  [Save]                   │
└─────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### No veo "Environment Variables" en el menú
- Asegúrate de estar en **Settings** (no en Overview)
- Verifica que tienes permisos de administrador en el proyecto

### Las variables no se aplican
- ✅ Verifica que hiciste **Redeploy** después de agregar las variables
- ✅ Verifica que marcaste los 3 environments (Production, Preview, Development)
- ✅ Espera 2-3 minutos después del redeploy

### Sigue viendo "Connection Lost"
- ✅ Verifica que las URLs están correctas (sin trailing slash `/` al final)
- ✅ Verifica que el backend está corriendo: `curl https://web-production-a1176.up.railway.app/api/health`
- ✅ Revisa la consola del navegador para ver errores específicos

### No puedo editar una variable
- Las variables existentes se pueden editar haciendo click en ellas
- O elimínalas y créalas de nuevo

---

## 📝 Resumen Rápido

1. **Vercel Dashboard** → Tu Proyecto
2. **Settings** → **Environment Variables**
3. **Add New** → Agregar `VITE_API_URL` y `VITE_SOCKET_URL`
4. Marcar **Production, Preview, Development**
5. **Save**
6. **Deployments** → **Redeploy**
7. Esperar 2-3 minutos
8. Probar en `www.pnl.onl`

---

## 🎉 ¡Listo!

Una vez configurado, tu frontend se conectará correctamente al backend en Railway.

