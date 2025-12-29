"use strict";
// Test script to compare two WebSocket APIs for Token Explorer
// APIs to test:
// 1. wss://pumpportal.fun/api/data
// 2. wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPumpPortalAPI = testPumpPortalAPI;
exports.testPumpFunSocketIO = testPumpFunSocketIO;
exports.runComparison = runComparison;
const ws_1 = __importDefault(require("ws"));
const socket_io_client_1 = require("socket.io-client");
async function testPumpPortalAPI() {
    const result = {
        api: 'pumpportal.fun',
        connected: false,
        tokensReceived: 0,
        latency: 0,
        dataQuality: 'low',
        errors: [],
        sampleData: null,
    };
    return new Promise((resolve) => {
        const startTime = Date.now();
        let tokensCount = 0;
        const sampleData = [];
        try {
            const ws = new ws_1.default('wss://pumpportal.fun/api/data');
            ws.on('open', () => {
                console.log('✅ PumpPortal API: Connected');
                result.connected = true;
                result.latency = Date.now() - startTime;
            });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    tokensCount++;
                    if (sampleData.length < 3) {
                        sampleData.push(message);
                    }
                    console.log(`📦 PumpPortal: Received token #${tokensCount}`, {
                        mint: message.mint || message.address || 'N/A',
                        name: message.name || 'N/A',
                        timestamp: message.timestamp || message.created_at || 'N/A',
                    });
                }
                catch (error) {
                    result.errors.push(`Parse error: ${error}`);
                }
            });
            ws.on('error', (error) => {
                console.error('❌ PumpPortal API Error:', error);
                result.errors.push(`Connection error: ${error.message}`);
                result.connected = false;
                resolve(result);
            });
            ws.on('close', () => {
                console.log('🔌 PumpPortal API: Closed');
                result.tokensReceived = tokensCount;
                result.sampleData = sampleData[0] || null;
                // Determine data quality
                if (tokensCount > 10 && sampleData.length > 0) {
                    result.dataQuality = 'high';
                }
                else if (tokensCount > 0) {
                    result.dataQuality = 'medium';
                }
                resolve(result);
            });
            // Timeout after 30 seconds
            setTimeout(() => {
                if (ws.readyState === ws_1.default.OPEN) {
                    ws.close();
                }
                result.tokensReceived = tokensCount;
                result.sampleData = sampleData[0] || null;
                resolve(result);
            }, 30000);
        }
        catch (error) {
            result.errors.push(`Setup error: ${error.message}`);
            resolve(result);
        }
    });
}
async function testPumpFunSocketIO() {
    const result = {
        api: 'frontend-api.pump.fun (Socket.IO)',
        connected: false,
        tokensReceived: 0,
        latency: 0,
        dataQuality: 'low',
        errors: [],
        sampleData: null,
    };
    return new Promise((resolve) => {
        const startTime = Date.now();
        let tokensCount = 0;
        const sampleData = [];
        try {
            const socket = (0, socket_io_client_1.io)('https://frontend-api.pump.fun', {
                transports: ['websocket'],
                upgrade: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                timeout: 20000,
            });
            socket.on('connect', () => {
                console.log('✅ Pump.fun Socket.IO: Connected', socket.id);
                result.connected = true;
                result.latency = Date.now() - startTime;
                // Try to subscribe to token updates
                // Common Socket.IO events for pump.fun might be:
                socket.emit('subscribe', 'tokens');
                socket.emit('subscribe', 'new-tokens');
                socket.emit('subscribe', 'coins');
            });
            socket.on('connect_error', (error) => {
                console.error('❌ Pump.fun Socket.IO Connection Error:', error);
                result.errors.push(`Connection error: ${error.message}`);
                result.connected = false;
                resolve(result);
            });
            // Listen for various possible events
            const events = [
                'token',
                'tokens',
                'new-token',
                'new-tokens',
                'coin',
                'coins',
                'update',
                'data',
                'message',
            ];
            events.forEach((event) => {
                socket.on(event, (data) => {
                    tokensCount++;
                    if (sampleData.length < 3) {
                        sampleData.push({ event, data });
                    }
                    console.log(`📦 Pump.fun Socket.IO [${event}]: Received data #${tokensCount}`, {
                        type: typeof data,
                        keys: Array.isArray(data) ? 'array' : Object.keys(data || {}),
                        sample: JSON.stringify(data).substring(0, 100),
                    });
                });
            });
            socket.on('disconnect', () => {
                console.log('🔌 Pump.fun Socket.IO: Disconnected');
                result.tokensReceived = tokensCount;
                result.sampleData = sampleData[0] || null;
                // Determine data quality
                if (tokensCount > 10 && sampleData.length > 0) {
                    result.dataQuality = 'high';
                }
                else if (tokensCount > 0) {
                    result.dataQuality = 'medium';
                }
                resolve(result);
            });
            // Timeout after 30 seconds
            setTimeout(() => {
                socket.disconnect();
                result.tokensReceived = tokensCount;
                result.sampleData = sampleData[0] || null;
                resolve(result);
            }, 30000);
        }
        catch (error) {
            result.errors.push(`Setup error: ${error.message}`);
            resolve(result);
        }
    });
}
async function runComparison() {
    console.log('🔍 Starting WebSocket API Comparison...\n');
    console.log('Testing APIs:');
    console.log('1. wss://pumpportal.fun/api/data');
    console.log('2. wss://frontend-api.pump.fun/socket.io\n');
    const results = [];
    // Test PumpPortal API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Testing PumpPortal API...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const pumpPortalResult = await testPumpPortalAPI();
    results.push(pumpPortalResult);
    // Wait a bit before testing next API
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Test Pump.fun Socket.IO
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Testing Pump.fun Socket.IO API...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const pumpFunResult = await testPumpFunSocketIO();
    results.push(pumpFunResult);
    // Print comparison
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 COMPARISON RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');
    results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.api}`);
        console.log(`   ✅ Connected: ${result.connected ? 'YES' : 'NO'}`);
        console.log(`   📦 Tokens Received: ${result.tokensReceived}`);
        console.log(`   ⚡ Latency: ${result.latency}ms`);
        console.log(`   📈 Data Quality: ${result.dataQuality.toUpperCase()}`);
        if (result.errors.length > 0) {
            console.log(`   ❌ Errors: ${result.errors.length}`);
            result.errors.forEach(err => console.log(`      - ${err}`));
        }
        if (result.sampleData) {
            console.log(`   📋 Sample Data:`, JSON.stringify(result.sampleData, null, 2).substring(0, 200));
        }
        console.log('');
    });
    // Determine winner
    const winner = results.reduce((best, current) => {
        if (!current.connected)
            return best;
        if (!best.connected)
            return current;
        // Score based on multiple factors
        const currentScore = (current.tokensReceived * 10) +
            (current.dataQuality === 'high' ? 50 : current.dataQuality === 'medium' ? 25 : 0) -
            (current.latency / 10) -
            (current.errors.length * 20);
        const bestScore = (best.tokensReceived * 10) +
            (best.dataQuality === 'high' ? 50 : best.dataQuality === 'medium' ? 25 : 0) -
            (best.latency / 10) -
            (best.errors.length * 20);
        return currentScore > bestScore ? current : best;
    }, results[0]);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🏆 WINNER: ${winner.api}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    return winner;
}
// Run if executed directly
if (require.main === module) {
    runComparison()
        .then((winner) => {
        console.log('\n✅ Comparison complete!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Comparison failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-websocket-apis.js.map