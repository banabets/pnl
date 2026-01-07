# 🔧 Discord Interactions Endpoint - Troubleshooting

## ❌ Error: "The specified interactions endpoint url could not be verified"

Este error significa que Discord no puede verificar tu endpoint. Aquí están las soluciones:

### ✅ Checklist de Verificación

1. **Endpoint accesible públicamente**
   ```bash
   curl https://pnl.onl/api/discord/interactions -X POST -H "Content-Type: application/json" -d '{"type":1}'
   ```
   Debe responder: `{"type":1}`

2. **Variables de entorno configuradas**
   ```bash
   DISCORD_PUBLIC_KEY=499c4c830721d542d34274d5d7b58ec05ce3f12b11e9e54ff44c4ff6dbdb228c
   DISCORD_BOT_TOKEN=tu_token
   ```

3. **Servidor corriendo y desplegado**
   - Verifica que el servidor esté corriendo en `https://pnl.onl`
   - Verifica que los cambios estén desplegados

4. **Endpoint responde en < 3 segundos**
   - Discord requiere respuesta rápida
   - El endpoint debe responder inmediatamente al PING

### 🔍 Pasos de Debugging

#### 1. Probar el endpoint manualmente

```bash
# Test PING
curl -X POST https://pnl.onl/api/discord/interactions \
  -H "Content-Type: application/json" \
  -H "x-signature-ed25519: test" \
  -H "x-signature-timestamp: $(date +%s)" \
  -d '{"type":1}'
```

**Respuesta esperada:** `{"type":1}`

#### 2. Verificar logs del servidor

Busca estos mensajes en los logs:
- `📡 Discord PING received` - Discord envió un PING
- `✅ Responding to PING with PONG` - El servidor respondió
- `❌ Invalid signature for PING` - La firma falló (pero aún responde)

#### 3. Verificar que el endpoint esté antes de express.json()

El endpoint DEBE estar definido ANTES de `app.use(express.json())` para recibir el body RAW.

#### 4. Verificar HTTPS

Discord requiere HTTPS en producción. Asegúrate de que:
- `https://pnl.onl` esté funcionando
- El certificado SSL sea válido
- No haya redirecciones que rompan la verificación

### 🛠️ Soluciones Comunes

#### Problema: Endpoint no responde

**Solución:**
1. Verifica que el servidor esté corriendo
2. Verifica que el endpoint esté desplegado
3. Revisa los logs del servidor

#### Problema: Timeout

**Solución:**
- El endpoint debe responder en < 3 segundos
- Asegúrate de que no haya operaciones lentas antes de responder al PING
- El PING se maneja inmediatamente, sin llamadas externas

#### Problema: Invalid signature

**Solución:**
- Verifica que `DISCORD_PUBLIC_KEY` esté correcto
- El Public Key debe ser: `499c4c830721d542d34274d5d7b58ec05ce3f12b11e9e54ff44c4ff6dbdb228c`
- Para la verificación inicial, el endpoint responde incluso si la firma falla

#### Problema: CORS o Headers

**Solución:**
- Discord envía headers específicos: `x-signature-ed25519` y `x-signature-timestamp`
- El endpoint debe aceptar estos headers
- CORS está configurado para permitir todos los orígenes

### 📝 Código del Endpoint

El endpoint está en `server/index.ts` y debe verse así:

```typescript
app.post('/api/discord/interactions', express.raw({ type: 'application/json' }), async (req, res) => {
  // ... código del endpoint
  if (body.type === 1) {
    return res.status(200).json({ type: 1 }); // PONG
  }
});
```

### 🧪 Test Script

Usa el script de test incluido:

```bash
node test-discord-endpoint.js
```

Esto probará si el endpoint responde correctamente.

### 📞 Si Nada Funciona

1. Verifica que el servidor esté desplegado y corriendo
2. Verifica que `https://pnl.onl/api/discord/interactions` sea accesible
3. Revisa los logs del servidor para ver qué está pasando
4. Asegúrate de que el código más reciente esté desplegado
5. Intenta registrar el endpoint nuevamente en Discord Developer Portal

### 🔄 Reintentar Verificación

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications/1457643453797367909)
2. General Information → Interactions Endpoint URL
3. Borra la URL y guárdala
4. Vuelve a poner: `https://pnl.onl/api/discord/interactions`
5. Guarda cambios
6. Discord intentará verificar nuevamente


