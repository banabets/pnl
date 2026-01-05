# 🤖 Guía: Bot de Discord para Buscar Tokens

## 📋 Descripción

Este bot de Discord permite buscar información completa de tokens de Solana usando su dirección de mint (mint address).

## 🚀 Instalación Rápida

### 1. Instalar dependencias

```bash
npm install discord.js dotenv
```

### 2. Crear archivo `.env`

```bash
DISCORD_BOT_TOKEN=tu_token_del_bot_de_discord
API_URL=https://pnl.onl  # Tu sitio web
DISCORD_PUBLIC_KEY=499c4c830721d542d34274d5d7b58ec05ce3f12b11e9e54ff44c4ff6dbdb228c  # Para Interactions Endpoint
```

**Nota:** El Public Key ya está configurado. Solo necesitas tu `DISCORD_BOT_TOKEN`.

### 3. Obtener Token de Discord Bot

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Si ya tienes una aplicación, selecciónala (App ID: `1457643453797367909`)
3. Ve a "Bot" → "Add Bot" (si no lo has hecho)
4. Copia el token y pégalo en `.env`
5. Habilita estos intents:
   - `MESSAGE CONTENT INTENT` (requerido para leer mensajes)
   - `SERVER MEMBERS INTENT` (opcional)

**App ID configurado:** `1457643453797367909`

### 4. Invitar el bot a tu servidor

**Opción rápida (con App ID configurado):**
```
https://discord.com/api/oauth2/authorize?client_id=1457643453797367909&permissions=274877906944&scope=bot
```

**O manualmente:**
1. En Discord Developer Portal → "OAuth2" → "URL Generator"
2. Selecciona:
   - `bot`
   - `Read Messages/View Channels`
   - `Send Messages`
   - `Embed Links`
3. Copia la URL y ábrela en el navegador
4. Selecciona el servidor donde quieres agregar el bot

### 5. Ejecutar el bot

```bash
node discord-bot-example.js
```

## 💬 Comandos Disponibles

### `!token <mint_address>` o `!t <mint_address>`

Busca información completa de un token.

**Ejemplo:**
```
!token 6LhgaTr4dDsJzLczhmHodmUXnnrVdB6XmR7havWWpump
```

**Respuesta:**
- Embed con toda la información del token:
  - Precio actual
  - Market Cap
  - Liquidez
  - Cambios de precio (5m, 1h, 24h)
  - Volumen
  - Holders
  - Transacciones
  - Edad del token
  - Risk Score
  - Estado (Nuevo, Graduando, Trending)
  - Enlaces a DexScreener, Birdeye, Solscan

### `!help` o `!h`

Muestra la ayuda con todos los comandos disponibles.

## 🔧 Personalización

### Cambiar el prefijo de comandos

En `discord-bot-example.js`, cambia:
```javascript
const PREFIX = '!';  // Cambia a lo que quieras, ej: '?', '$', etc.
```

### Agregar más comandos

Puedes agregar más comandos en el evento `messageCreate`:

```javascript
// Ejemplo: Comando para buscar tokens nuevos
if (command === 'new') {
  // Llamar a /api/tokens/new
  const response = await fetch(`${API_URL}/api/tokens/new?limit=5`);
  // ... procesar y mostrar resultados
}
```

## 📡 Endpoints de API Disponibles

El bot usa estos endpoints de tu servidor:

- `GET /api/tokens/:mint` - Obtener token por mint address
- `GET /api/tokens/new` - Tokens nuevos
- `GET /api/tokens/trending` - Tokens trending
- `GET /api/tokens/graduating` - Tokens graduando
- `GET /api/tokens/feed?filter=all` - Feed de tokens

## 🎨 Ejemplo de Respuesta

El bot devuelve un embed de Discord con:

```
┌─────────────────────────────────────┐
│ Token Name (SYMBOL)                  │
│ [Imagen del token]                   │
├─────────────────────────────────────┤
│ 💰 Precio: $0.000123                │
│ 📊 Market Cap: $125.5K              │
│ 💧 Liquidez: $45.2K                 │
│ 📈 Cambio 24h: 🟢 +15.23%          │
│ 👥 Holders: 1,234                   │
│ 📊 Volumen 24h: $12.3K              │
│ 🏅 Estado: 🆕 Nuevo 🔥 Trending    │
├─────────────────────────────────────┤
│ 🔗 [DexScreener] • [Birdeye] • ... │
└─────────────────────────────────────┘
```

## ⚠️ Notas Importantes

1. **Rate Limits**: El bot respeta los rate limits de DexScreener. Si hay muchos rate limits, el bot puede tardar más en responder.

2. **Token no encontrado**: Si el token no existe o no está en DexScreener, el bot responderá con un error.

3. **Validación**: El bot valida básicamente el formato del mint address, pero no verifica si es válido hasta hacer la llamada a la API.

## 🔒 Seguridad

- **NUNCA** compartas tu `DISCORD_BOT_TOKEN` públicamente
- Agrega `.env` a `.gitignore`
- Usa variables de entorno en producción (Railway, Vercel, etc.)

## 🚀 Deploy en Producción

### Railway / Vercel

1. Agrega las variables de entorno:
   - `DISCORD_BOT_TOKEN`
   - `API_URL` (URL de tu servidor desplegado)

2. El bot puede correr en el mismo servidor o en uno separado

### Ejecutar como servicio

Usa PM2 para mantener el bot corriendo:

```bash
npm install -g pm2
pm2 start discord-bot-example.js --name discord-bot
pm2 save
pm2 startup
```

## 📝 Ejemplo Completo de Uso

```
Usuario: !token 6LhgaTr4dDsJzLczhmHodmUXnnrVdB6XmR7havWWpump

Bot: [Embed con toda la información del token]
```

## 🛠️ Troubleshooting

**Bot no responde:**
- Verifica que el token esté correcto en `.env`
- Asegúrate de que los intents estén habilitados
- Revisa los logs del bot

**Token no encontrado:**
- Verifica que el mint address sea correcto
- El token puede no estar en DexScreener aún
- Intenta con otro token conocido

**Rate limits:**
- Es normal si hay muchas búsquedas
- El bot esperará automáticamente
- Considera aumentar el delay entre comandos

