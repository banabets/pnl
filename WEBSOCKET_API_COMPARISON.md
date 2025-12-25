# 🔍 Comparación de APIs WebSocket para Token Explorer

## APIs a Comparar

### 1. PumpPortal API
- **URL**: `wss://pumpportal.fun/api/data`
- **Protocolo**: WebSocket estándar
- **Requisitos**: 
  - API Key requerida
  - Wallet vinculada con mínimo 0.02 SOL
  - Costo: 0.01 SOL por cada 10,000 mensajes
- **Método de suscripción**: Enviar JSON `{"method": "subscribeNewToken"}`
- **Ventajas**:
  - WebSocket estándar (fácil de implementar)
  - Documentación disponible
  - Datos estructurados
- **Desventajas**:
  - Requiere API key y wallet
  - Tiene costo por mensajes
  - Requiere mantener solo una conexión activa

### 2. Pump.fun Socket.IO API
- **URL**: `wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket`
- **Protocolo**: Socket.IO (no WebSocket estándar)
- **Requisitos**: 
  - Cliente Socket.IO necesario
  - Probablemente gratis (no documentado)
- **Método de suscripción**: Eventos Socket.IO (necesita descubrir eventos correctos)
- **Ventajas**:
  - Probablemente gratis
  - API oficial de pump.fun
  - Datos en tiempo real
- **Desventajas**:
  - Requiere cliente Socket.IO
  - Eventos no documentados (necesita reverse engineering)
  - Protocolo más complejo

## 🧪 Cómo Probar

### Opción 1: Endpoint de Prueba (Recomendado)
```bash
# Asegúrate de que el servidor esté corriendo
curl http://localhost:3001/api/pumpfun/test-websockets
```

### Opción 2: Prueba Manual

#### PumpPortal API (Node.js)
```javascript
const WebSocket = require('ws');

const ws = new WebSocket('wss://pumpportal.fun/api/data?api-key=TU_API_KEY');

ws.on('open', () => {
  console.log('Connected');
  // Suscribirse a nuevos tokens
  ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
});

ws.on('message', (data) => {
  const token = JSON.parse(data.toString());
  console.log('New token:', token);
});
```

#### Pump.fun Socket.IO (Node.js)
```javascript
const io = require('socket.io-client');

const socket = io('https://frontend-api.pump.fun', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  // Intentar suscribirse
  socket.emit('subscribe', 'tokens');
  socket.emit('subscribe', 'new-tokens');
});

socket.onAny((event, ...args) => {
  console.log('Event:', event, args);
});
```

## 📊 Criterios de Comparación

1. **Conexión**: ¿Se conecta exitosamente?
2. **Latencia**: Tiempo de conexión
3. **Tokens Recibidos**: Cantidad de tokens en 15-20 segundos
4. **Calidad de Datos**: Estructura y completitud de los datos
5. **Errores**: Errores durante la conexión
6. **Costo**: Costo de uso
7. **Facilidad de Implementación**: Complejidad de integración

## 🎯 Recomendación

Basado en la investigación:

### Si tienes API Key de PumpPortal:
- **Usa PumpPortal API** - Más confiable, documentada, datos estructurados

### Si no tienes API Key:
- **Usa Pump.fun Socket.IO** - Gratis pero requiere más trabajo para descubrir eventos
- **O mantén el método actual** - Solana RPC WebSocket (gratis, confiable)

## 🔧 Implementación Sugerida

1. **Probar ambas APIs** usando el endpoint `/api/pumpfun/test-websockets`
2. **Implementar la mejor** basado en resultados
3. **Mantener fallback** al método actual (Solana RPC) si ambas fallan

## 📝 Notas

- PumpPortal requiere autenticación y tiene costo
- Pump.fun Socket.IO es gratis pero los eventos no están documentados
- El método actual (Solana RPC) es gratis y funciona, pero puede ser más lento



