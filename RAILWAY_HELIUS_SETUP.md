# 🔑 Configurar HELIUS_API_KEY en Railway

Esta guía te muestra cómo configurar la API key de Helius en Railway para mejorar el rendimiento y evitar errores de rate limiting.

## 📋 Pasos para Configurar HELIUS_API_KEY

### Paso 1: Obtener una API Key de Helius

1. Ve a [https://helius.dev](https://helius.dev)
2. Crea una cuenta (es gratuita)
3. Ve a tu **Dashboard**
4. Crea un nuevo proyecto o selecciona uno existente
5. Copia tu **API Key** (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Paso 2: Configurar en Railway Dashboard

#### Opción A: Desde el Dashboard Web (Recomendado)

1. **Accede a Railway Dashboard**
   - Ve a [railway.app](https://railway.app)
   - Inicia sesión en tu cuenta

2. **Selecciona tu Proyecto**
   - Haz clic en el proyecto que contiene tu servicio backend

3. **Ve a Variables de Entorno**
   - Haz clic en tu servicio (el que ejecuta el backend)
   - En el menú lateral, haz clic en **"Variables"** o **"Environment Variables"**

4. **Agrega la Variable**
   - Haz clic en **"+ New Variable"** o **"Add Variable"**
   - **Nombre de la variable**: `HELIUS_API_KEY`
   - **Valor**: Pega tu API key de Helius (ejemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
   - Haz clic en **"Add"** o **"Save"**

5. **Verifica que se agregó**
   - Deberías ver `HELIUS_API_KEY` en la lista de variables de entorno

#### Opción B: Usando Railway CLI

```bash
# 1. Asegúrate de estar en el directorio del proyecto
cd /Users/g/Desktop/bund

# 2. Vincula tu proyecto (si no lo has hecho)
railway link

# 3. Agrega la variable de entorno
railway variables set HELIUS_API_KEY=tu-api-key-aqui

# 4. Verifica que se agregó
railway variables
```

### Paso 3: Reiniciar el Servicio

Después de agregar la variable de entorno, Railway debería **reiniciar automáticamente** tu servicio. Si no lo hace:

1. Ve a **Railway Dashboard → Tu Servicio**
2. Haz clic en el menú de tres puntos (⋯) en la parte superior
3. Selecciona **"Redeploy"** o **"Restart"**

### Paso 4: Verificar que Funciona

1. **Revisa los Logs**
   - Ve a **Railway Dashboard → Tu Servicio → Deployments → Latest → Logs**
   - Busca mensajes como:
     - ✅ `Using Helius WebSocket with API key`
     - ✅ `Extracted Helius API key from RPC_URL`
     - ❌ NO deberías ver: `⚠️ Using public Solana RPC`

2. **Prueba el Endpoint de Health**
   ```bash
   curl https://tu-app.railway.app/api/health
   ```

3. **Verifica en los Logs del Servidor**
   - Los errores `429 Too Many Requests` deberían desaparecer
   - Los errores `401` en WebSocket deberían desaparecer

## 🔍 Verificación de Variables de Entorno

Para ver todas tus variables de entorno en Railway:

### Desde el Dashboard:
1. Ve a **Tu Servicio → Variables**
2. Verás una lista de todas las variables configuradas

### Desde CLI:
```bash
railway variables
```

## 📝 Variables Relacionadas (Opcional)

Si prefieres usar `RPC_URL` en lugar de `HELIUS_API_KEY`, puedes configurar:

```
RPC_URL=https://mainnet.helius-rpc.com/?api-key=tu-api-key-aqui
```

**Nota**: El sistema puede extraer la API key de `RPC_URL` automáticamente, pero es mejor usar `HELIUS_API_KEY` directamente.

## ⚠️ Solución de Problemas

### La variable no se aplica
- ✅ Verifica que el nombre sea exactamente `HELIUS_API_KEY` (sin espacios, mayúsculas correctas)
- ✅ Asegúrate de que el valor sea tu API key completa
- ✅ Reinicia el servicio manualmente

### Siguen apareciendo errores 429
- ✅ Verifica que la API key sea válida en [helius.dev](https://helius.dev)
- ✅ Asegúrate de que la API key tenga permisos de WebSocket habilitados
- ✅ Revisa los logs para ver si hay errores de autenticación

### Errores 401 en WebSocket
- ✅ Verifica que la API key tenga el formato correcto (36 caracteres, formato UUID)
- ✅ Asegúrate de que la API key no sea un placeholder o ejemplo
- ✅ Verifica que la API key tenga permisos de WebSocket en Helius

## 🎯 Resultado Esperado

Después de configurar `HELIUS_API_KEY` correctamente:

✅ **No más errores 429**: El sistema usará el RPC de Helius con rate limits más altos
✅ **No más errores 401**: El WebSocket se conectará correctamente
✅ **Mejor rendimiento**: Las peticiones serán más rápidas
✅ **Logs más limpios**: Menos advertencias y errores

## 📚 Recursos Adicionales

- **Helius Dashboard**: [https://helius.dev](https://helius.dev)
- **Documentación de Helius**: [https://docs.helius.dev](https://docs.helius.dev)
- **Railway Docs**: [https://docs.railway.app](https://docs.railway.app)
- **Railway Variables**: [https://docs.railway.app/develop/variables](https://docs.railway.app/develop/variables)

## 💡 Tips

1. **API Key Gratuita**: Helius ofrece un tier gratuito generoso para desarrollo
2. **Seguridad**: Nunca compartas tu API key públicamente
3. **Backup**: Guarda tu API key en un lugar seguro
4. **Monitoreo**: Revisa el uso de tu API key en el dashboard de Helius

