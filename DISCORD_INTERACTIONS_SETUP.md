# 🔗 Configuración de Discord Interactions Endpoint

## 📍 URL del Endpoint

En el **Discord Developer Portal** → **General Information** → **Interactions Endpoint URL**, pon:

```
https://pnl.onl/api/discord/interactions
```

**Tu sitio:** `https://pnl.onl`  
**Endpoint completo:** `https://pnl.onl/api/discord/interactions`

**Para desarrollo local:**
- Local: `http://localhost:3001/api/discord/interactions` (usar ngrok para testing)

## 🔑 Variables de Entorno Requeridas

Agrega estas variables a tu `.env`:

```bash
# Discord Bot Token (ya lo tienes)
DISCORD_BOT_TOKEN=tu_token_del_bot

# Discord Public Key (NECESARIO para verificar firmas)
# App ID: 1457643453797367909
DISCORD_PUBLIC_KEY=499c4c830721d542d34274d5d7b58ec05ce3f12b11e9e54ff44c4ff6dbdb228c
```

## 🔍 Public Key Configurado

**App ID:** `1457643453797367909`  
**Public Key:** `499c4c830721d542d34274d5d7b58ec05ce3f12b11e9e54ff44c4ff6dbdb228c`

Este Public Key ya está configurado para tu aplicación. Solo necesitas agregarlo a tus variables de entorno.

## ✅ Verificación del Endpoint

Cuando pongas la URL en Discord Developer Portal:

1. Discord enviará un **PING** a tu endpoint
2. Tu servidor debe responder con `{"type": 1}` (PONG)
3. Si funciona, verás un checkmark verde ✅

## 🚀 Pasos para Configurar

### 1. Configurar Variables de Entorno

```bash
# En tu servidor (Railway, Vercel, etc.)
DISCORD_PUBLIC_KEY=499c4c830721d542d34274d5d7b58ec05ce3f12b11e9e54ff44c4ff6dbdb228c
DISCORD_BOT_TOKEN=tu_bot_token_aqui
```

**Nota:** El Public Key ya está configurado. Solo necesitas agregar tu `DISCORD_BOT_TOKEN`.

### 2. Registrar el Endpoint en Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación (App ID: `1457643453797367909`)
3. Ve a **General Information**
4. En **Interactions Endpoint URL**, pon: `https://pnl.onl/api/discord/interactions`
5. Haz clic en **Save Changes**
6. Discord verificará automáticamente el endpoint (deberías ver un checkmark verde ✅)

### 3. Crear Slash Commands (Opcional)

Para usar Slash Commands (`/token` en lugar de `!token`):

1. Ve a **OAuth2** → **URL Generator**
2. Selecciona `applications.commands` scope
3. Genera la URL e invita el bot con permisos de comandos

O usa la API directamente:

```bash
curl -X POST \
  https://discord.com/api/v10/applications/1457643453797367909/commands \
  -H "Authorization: Bot TU_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "token",
    "description": "Busca información de un token por su mint address",
    "options": [
      {
        "name": "mint",
        "description": "Dirección de mint del token",
        "type": 3,
        "required": true
      }
    ]
  }'
```

## 🧪 Testing Local con ngrok

Para probar localmente:

1. Instala ngrok: `npm install -g ngrok`
2. Ejecuta: `ngrok http 3001`
3. Copia la URL HTTPS (ej: `https://abc123.ngrok.io`)
4. Pon en Discord: `https://abc123.ngrok.io/api/discord/interactions`
5. Ejecuta tu servidor: `npm start`

## 📝 Endpoint Implementado

El endpoint `/api/discord/interactions` maneja:

- **PING** (type 1): Verificación de Discord → Responde PONG
- **APPLICATION_COMMAND** (type 2): Slash Commands
  - `/token <mint>`: Busca información del token
  - Devuelve un embed con toda la información

## 🔒 Seguridad

El endpoint verifica la firma Ed25519 de Discord para asegurar que las peticiones vienen realmente de Discord. Sin esto, cualquiera podría enviar comandos falsos.

## 🐛 Troubleshooting

**Error: "Invalid signature"**
- Verifica que `DISCORD_PUBLIC_KEY` esté correcto
- Asegúrate de que el endpoint reciba el body RAW (sin parsear)

**Error: "Missing signature headers"**
- Discord debe enviar `x-signature-ed25519` y `x-signature-timestamp`
- Verifica que el endpoint esté accesible públicamente

**Endpoint no responde**
- Verifica que el servidor esté corriendo
- Revisa los logs del servidor
- Asegúrate de que la URL sea HTTPS (Discord requiere HTTPS en producción)

**PING no funciona**
- El endpoint debe responder `{"type": 1}` inmediatamente
- Verifica que no haya middleware bloqueando la respuesta

## 📚 Referencias

- [Discord Interactions API](https://discord.com/developers/docs/interactions/overview)
- [Discord Slash Commands](https://discord.com/developers/docs/interactions/application-commands)
- [Ed25519 Signature Verification](https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization)

