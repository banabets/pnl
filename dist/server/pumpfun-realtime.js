"use strict";
// Pump.fun Real-time Listener - Suscripción directa al programa sin indexadores pagos
// Usa connection.onLogs() para obtener tokens en tiempo real GRATIS
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunRealtimeListener = void 0;
const web3_js_1 = require("@solana/web3.js");
const events_1 = require("events");
const PUMP_FUN_PROGRAM_ID = new web3_js_1.PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6Px');
// Tokens conocidos a excluir (Wrapped SOL, tokens genéricos, etc.)
const EXCLUDED_MINTS = new Set([
    'So11111111111111111111111111111111111111112', // Wrapped SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);
class PumpFunRealtimeListener extends events_1.EventEmitter {
    constructor(rpcUrl) {
        super();
        this.isListening = false;
        this.logSubscriptionId = null;
        this.accountSubscriptionId = null;
        this.recentTokens = new Map(); // Para evitar duplicados
        this.DEDUP_WINDOW = 10000; // 10 segundos
        const url = rpcUrl || process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=7b05747c-b100-4159-ba5f-c85e8c8d3997';
        this.connection = new web3_js_1.Connection(url, {
            commitment: 'confirmed',
            wsEndpoint: url.replace('https://', 'wss://').replace('http://', 'ws://'),
        });
    }
    /**
     * Iniciar suscripción en tiempo real al programa de pump.fun
     */
    async start() {
        if (this.isListening) {
            console.log('⚠️ PumpFun Realtime Listener ya está escuchando');
            return;
        }
        try {
            console.log('🚀 Iniciando PumpFun Realtime Listener...');
            console.log(`📡 Programa: ${PUMP_FUN_PROGRAM_ID.toBase58()}`);
            // Método 1: Suscribirse a logs del programa (GRATIS, sin indexadores)
            // Esto captura todas las transacciones del programa pump.fun
            this.logSubscriptionId = this.connection.onLogs(PUMP_FUN_PROGRAM_ID, async (logs, context) => {
                try {
                    if (logs.err) {
                        console.log(`⚠️ Transacción fallida detectada: ${logs.signature.substring(0, 16)}...`);
                        return; // Ignorar transacciones fallidas
                    }
                    const signature = logs.signature;
                    const logMessages = logs.logs || [];
                    // LOGGING DETALLADO DEL SUBSCRIBE
                    console.log(`\n${'='.repeat(80)}`);
                    console.log(`📡 NUEVO LOG RECIBIDO DEL PROGRAMA PUMP.FUN`);
                    console.log(`${'='.repeat(80)}`);
                    console.log(`🔑 Signature: ${signature}`);
                    console.log(`📝 Total log messages: ${logMessages.length}`);
                    console.log(`⏱️ Timestamp: ${new Date().toISOString()}`);
                    console.log(`🔍 Slot: ${context.slot}`);
                    console.log(`\n📋 LOG MESSAGES:`);
                    logMessages.forEach((msg, i) => {
                        console.log(`  [${i}] ${msg}`);
                    });
                    console.log(`${'='.repeat(80)}\n`);
                    // Verificar si ya procesamos este token recientemente (deduplicación)
                    const now = Date.now();
                    if (this.recentTokens.has(signature)) {
                        const lastSeen = this.recentTokens.get(signature);
                        if (now - lastSeen < this.DEDUP_WINDOW) {
                            console.log(`⏭️ Signature ${signature.substring(0, 16)}... ya procesada recientemente, saltando...`);
                            return; // Ya procesado recientemente
                        }
                    }
                    this.recentTokens.set(signature, now);
                    // Limpiar tokens antiguos del mapa de deduplicación
                    if (this.recentTokens.size > 1000) {
                        const cutoff = now - this.DEDUP_WINDOW;
                        for (const [sig, timestamp] of this.recentTokens.entries()) {
                            if (timestamp < cutoff) {
                                this.recentTokens.delete(sig);
                            }
                        }
                    }
                    // Analizar logs para detectar eventos
                    const logsStr = logMessages.join(' ');
                    // Detectar creación de nuevo token
                    // Buscar patrones más específicos de pump.fun
                    const isCreate = logsStr.includes('Program log: Instruction: Create') ||
                        logsStr.includes('Program log: Instruction: Initialize') ||
                        logsStr.includes('Program log: Create') ||
                        logsStr.includes('Program log: Initialize') ||
                        (logsStr.includes('Program log') && logsStr.includes('pump'));
                    const isTrade = logsStr.includes('Program log: Instruction: Buy') ||
                        logsStr.includes('Program log: Instruction: Sell') ||
                        logsStr.includes('Program log: Buy') ||
                        logsStr.includes('Program log: Sell');
                    console.log(`🔎 ANÁLISIS DE PATRÓN:`);
                    console.log(`  - Es Create/Initialize: ${isCreate}`);
                    console.log(`  - Es Buy/Sell: ${isTrade}`);
                    if (isCreate) {
                        console.log(`✅ DETECTADO COMO NUEVO TOKEN - Programando procesamiento...`);
                        console.log(`🆕 Nueva transacción pump.fun detectada: ${signature.substring(0, 16)}...`);
                        // Obtener detalles de la transacción (con delay para asegurar que esté disponible)
                        setTimeout(async () => {
                            try {
                                console.log(`⏳ Procesando transacción de nuevo token: ${signature.substring(0, 16)}...`);
                                await this.processTransaction(signature, 'new_token');
                            }
                            catch (error) {
                                console.warn(`❌ Error procesando transacción ${signature.substring(0, 16)}...:`, error.message);
                            }
                        }, 1500); // Delay de 1.5 segundos para asegurar que la transacción esté disponible
                    }
                    // Detectar trades (buy/sell)
                    if (isTrade) {
                        console.log(`✅ DETECTADO COMO TRADE - Programando procesamiento...`);
                        setTimeout(async () => {
                            try {
                                console.log(`⏳ Procesando trade: ${signature.substring(0, 16)}...`);
                                await this.processTransaction(signature, 'trade');
                            }
                            catch (error) {
                                // Ignorar errores silenciosamente
                            }
                        }, 500);
                    }
                    if (!isCreate && !isTrade) {
                        console.log(`⏭️ No coincide con patrones conocidos, saltando...`);
                    }
                }
                catch (error) {
                    console.error('❌ Error procesando logs:', error);
                }
            }, 'confirmed');
            console.log(`✅ Suscrito a logs del programa pump.fun (Subscription ID: ${this.logSubscriptionId})`);
            // Método 2: También suscribirse a cambios de cuenta para detectar nuevos tokens
            // Esto es más específico pero puede ser más costoso en términos de recursos
            // Por ahora lo dejamos comentado y usamos solo logs
            this.isListening = true;
            console.log('✅ PumpFun Realtime Listener iniciado correctamente');
            console.log('📊 Escuchando tokens nuevos en tiempo real...');
        }
        catch (error) {
            console.error('❌ Error iniciando PumpFun Realtime Listener:', error);
            throw error;
        }
    }
    /**
     * Procesar una transacción para extraer información del token
     */
    async processTransaction(signature, eventType) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 PROCESANDO TRANSACCIÓN`);
        console.log(`${'='.repeat(80)}`);
        console.log(`🔑 Signature: ${signature}`);
        console.log(`📌 Event Type: ${eventType}`);
        console.log(`${'='.repeat(80)}\n`);
        try {
            console.log(`⏳ Obteniendo transacción de la blockchain...`);
            const tx = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
            if (!tx || !tx.meta) {
                console.log(`❌ Transacción no encontrada o sin metadata`);
                return;
            }
            console.log(`✅ Transacción obtenida exitosamente`);
            console.log(`📊 Block Time: ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'N/A'}`);
            // Extraer información de la transacción
            const accountKeys = tx.transaction.message instanceof Object && 'accountKeys' in tx.transaction.message
                ? tx.transaction.message.accountKeys
                : tx.transaction.message.getAccountKeys().staticAccountKeys;
            console.log(`📋 Total de cuentas en transacción: ${accountKeys.length}`);
            // Buscar el mint del token (generalmente está en las cuentas de la transacción)
            let tokenMint = null;
            let creator = null;
            let bondingCurve = null;
            // El mint del token generalmente está en las cuentas
            // Para pump.fun, el mint suele estar en las primeras cuentas
            // Pero necesitamos verificar que sea realmente un token de pump.fun
            const TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
            console.log(`🔍 Buscando token mint en las primeras 15 cuentas...`);
            for (let i = 0; i < Math.min(accountKeys.length, 15); i++) {
                const account = accountKeys[i];
                const pubkey = account instanceof web3_js_1.PublicKey ? account : new web3_js_1.PublicKey(account);
                const pubkeyStr = pubkey.toBase58();
                console.log(`  [${i}] Verificando cuenta: ${pubkeyStr.substring(0, 12)}...`);
                // Excluir tokens conocidos (Wrapped SOL, USDC, etc.)
                if (EXCLUDED_MINTS.has(pubkeyStr)) {
                    console.log(`      ⏭️ Token excluido conocido`);
                    continue;
                }
                // Verificar si es un token mint (tiene metadata de token)
                try {
                    const accountInfo = await this.connection.getAccountInfo(pubkey);
                    if (accountInfo && accountInfo.data.length > 0) {
                        console.log(`      📦 Account info obtenida - Owner: ${accountInfo.owner.toBase58().substring(0, 12)}...`);
                        console.log(`      📏 Data length: ${accountInfo.data.length} bytes`);
                        // Verificar si es un mint de token SPL
                        if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
                            console.log(`      ✅ Owner es Token Program!`);
                            // Verificar que el tamaño del data sea correcto para un mint (82 bytes mínimo)
                            if (accountInfo.data.length >= 82) {
                                console.log(`      ✅ Data length válido para mint (>= 82 bytes)`);
                                // Verificar que no sea un token conocido excluido
                                if (!EXCLUDED_MINTS.has(pubkeyStr)) {
                                    tokenMint = pubkeyStr;
                                    console.log(`      ✅✅✅ TOKEN MINT ENCONTRADO: ${pubkeyStr}`);
                                    break;
                                }
                            }
                            else {
                                console.log(`      ⏭️ Data length insuficiente para mint`);
                            }
                        }
                        else {
                            console.log(`      ⏭️ Owner no es Token Program`);
                        }
                    }
                    else {
                        console.log(`      ⏭️ No account info o data vacía`);
                    }
                }
                catch (error) {
                    console.log(`      ⚠️ Error verificando cuenta: ${error.message}`);
                    // Continuar buscando
                }
            }
            // Si no encontramos el mint de la forma anterior, intentar extraerlo de los logs
            if (!tokenMint) {
                const logs = tx.meta.logMessages || [];
                for (const log of logs) {
                    // Buscar patrones en los logs que indiquen el mint
                    const mintMatch = log.match(/mint[:\s]+([A-Za-z0-9]{32,44})/i);
                    if (mintMatch) {
                        tokenMint = mintMatch[1];
                        break;
                    }
                }
            }
            // Extraer creator (el signer de la transacción)
            if (tx.transaction.message instanceof Object && 'accountKeys' in tx.transaction.message) {
                const staticKeys = tx.transaction.message.accountKeys;
                if (staticKeys.length > 0) {
                    const signer = staticKeys[0];
                    creator = signer instanceof web3_js_1.PublicKey ? signer.toBase58() : new web3_js_1.PublicKey(signer).toBase58();
                }
            }
            else {
                const signers = tx.transaction.message.getAccountKeys().staticAccountKeys;
                if (signers.length > 0) {
                    creator = signers[0].toBase58();
                }
            }
            // Buscar bonding curve (PDA de pump.fun)
            for (const account of accountKeys.slice(0, 20)) {
                const pubkey = account instanceof web3_js_1.PublicKey ? account : new web3_js_1.PublicKey(account);
                const pubkeyStr = pubkey.toBase58();
                // El bonding curve es un PDA, podemos intentar derivarlo
                // Por ahora, lo marcamos si encontramos una cuenta relacionada
                if (pubkeyStr.length === 44) {
                    bondingCurve = pubkeyStr;
                    break;
                }
            }
            if (eventType === 'new_token' && tokenMint) {
                // Verificar que no sea un token excluido
                if (EXCLUDED_MINTS.has(tokenMint)) {
                    console.log(`⚠️ Token excluido detectado (Wrapped SOL o similar): ${tokenMint.substring(0, 8)}...`);
                    return;
                }
                const event = {
                    type: 'new_token',
                    mint: tokenMint,
                    signature,
                    timestamp: Date.now(),
                    creator: creator || undefined,
                    bondingCurve: bondingCurve || undefined,
                    // IMPORTANTE: Proporcionar valores por defecto basados en el mint
                    name: `Token ${tokenMint.substring(0, 8)}`,
                    symbol: tokenMint.substring(0, 4).toUpperCase(),
                };
                console.log(`\n${'*'.repeat(80)}`);
                console.log(`🆕🆕🆕 NUEVO TOKEN DETECTADO 🆕🆕🆕`);
                console.log(`${'*'.repeat(80)}`);
                console.log(`🪙 Mint: ${tokenMint}`);
                console.log(`🔑 Signature: ${signature}`);
                console.log(`👤 Creator: ${creator || 'N/A'}`);
                console.log(`📈 Bonding Curve: ${bondingCurve || 'N/A'}`);
                console.log(`⏱️ Timestamp: ${new Date(event.timestamp).toISOString()}`);
                console.log(`${'*'.repeat(80)}\n`);
                console.log(`📡 EMITIENDO EVENTOS 'new_token' y 'token_event' CON NOMBRE TEMPORAL...`);
                // Emitir evento INMEDIATAMENTE con información básica (incluye nombre temporal)
                this.emit('new_token', event);
                this.emit('token_event', event);
                console.log(`✅ Eventos emitidos correctamente (con nombre temporal: ${event.name})`);
                console.log(`⏳ Iniciando enriquecimiento asíncrono para obtener nombre REAL...\n`);
                // Intentar obtener más información del token (nombre, símbolo, etc.)
                // Esto se puede hacer de forma asíncrona sin bloquear
                // Crear una copia del evento para evitar modificar el original
                const enrichableEvent = { ...event };
                this.enrichTokenInfo(tokenMint, enrichableEvent).catch((error) => {
                    console.warn(`⚠️ Error enriqueciendo token ${tokenMint.substring(0, 8)}...:`, error.message);
                });
            }
            else if (eventType === 'trade' && tokenMint) {
                const event = {
                    type: 'trade',
                    mint: tokenMint,
                    signature,
                    timestamp: Date.now(),
                };
                console.log(`\n💱 TRADE DETECTADO`);
                console.log(`🪙 Mint: ${tokenMint}`);
                console.log(`🔑 Signature: ${signature}`);
                console.log(`📡 Emitiendo eventos 'trade' y 'token_event'...\n`);
                this.emit('trade', event);
                this.emit('token_event', event);
                console.log(`✅ Eventos de trade emitidos\n`);
            }
            else if (!tokenMint) {
                console.log(`\n⚠️ TRANSACCIÓN PROCESADA PERO SIN TOKEN MINT`);
                console.log(`🔑 Signature: ${signature}`);
                console.log(`📌 Event Type: ${eventType}`);
                console.log(`❌ No se pudo extraer el token mint de la transacción\n`);
            }
        }
        catch (error) {
            // Ignorar errores silenciosamente para no saturar los logs
            // console.warn(`Error procesando transacción ${signature.substring(0, 16)}...:`, error);
        }
    }
    /**
     * Enriquecer información del token (nombre, símbolo, precio, etc.)
     */
    async enrichTokenInfo(mint, event) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 INICIANDO ENRIQUECIMIENTO DE TOKEN`);
        console.log(`${'='.repeat(80)}`);
        console.log(`🪙 Mint: ${mint}`);
        console.log(`📊 Evento actual:`, JSON.stringify(event, null, 2));
        console.log(`${'='.repeat(80)}\n`);
        try {
            // Método 1: Intentar obtener información de pump.fun API
            console.log(`🔄 Método 1: Intentando pump.fun API...`);
            console.log(`📡 URL: https://frontend-api.pump.fun/coins/${mint}`);
            try {
                const pumpApiUrl = `https://frontend-api.pump.fun/coins/${mint}`;
                const response = await fetch(pumpApiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Referer': 'https://pump.fun/',
                    },
                    timeout: 5000,
                });
                console.log(`📥 Response status: ${response.status} ${response.statusText}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ pump.fun API respuesta exitosa:`);
                    console.log(`📦 Data recibida:`, JSON.stringify(data, null, 2));
                    // Actualizar evento con información enriquecida
                    let updated = false;
                    if (data.name && data.name.trim() && data.name.toLowerCase() !== 'pump fun') {
                        console.log(`✅ Nombre encontrado: "${data.name}"`);
                        event.name = data.name;
                        updated = true;
                    }
                    else {
                        console.log(`⚠️ Nombre no válido o no encontrado: "${data.name}"`);
                    }
                    if (data.symbol && data.symbol.trim() && data.symbol.toLowerCase() !== 'pump') {
                        console.log(`✅ Símbolo encontrado: "${data.symbol}"`);
                        event.symbol = data.symbol;
                        updated = true;
                    }
                    else {
                        console.log(`⚠️ Símbolo no válido o no encontrado: "${data.symbol}"`);
                    }
                    if (data.token_name && !event.name) {
                        console.log(`✅ Token name encontrado: "${data.token_name}"`);
                        event.name = data.token_name;
                        updated = true;
                    }
                    if (data.token_symbol && !event.symbol) {
                        console.log(`✅ Token symbol encontrado: "${data.token_symbol}"`);
                        event.symbol = data.token_symbol;
                        updated = true;
                    }
                    event.price = data.usd_market_cap ? data.usd_market_cap / (data.market_cap || 1) : undefined;
                    event.volume = data.volume_24h || data.volume || undefined;
                    event.liquidity = data.liquidity || undefined;
                    event.marketCap = data.usd_market_cap || data.market_cap || undefined;
                    event.holders = data.holders || undefined;
                    console.log(`\n📊 RESULTADO FINAL DEL ENRIQUECIMIENTO:`);
                    console.log(`  - Nombre: ${event.name || 'NO ENCONTRADO'}`);
                    console.log(`  - Símbolo: ${event.symbol || 'NO ENCONTRADO'}`);
                    console.log(`  - Precio: ${event.price || 'N/A'}`);
                    console.log(`  - Volumen: ${event.volume || 'N/A'}`);
                    console.log(`  - Liquidez: ${event.liquidity || 'N/A'}`);
                    console.log(`  - Market Cap: ${event.marketCap || 'N/A'}`);
                    console.log(`  - Holders: ${event.holders || 'N/A'}`);
                    if (updated) {
                        console.log(`✅ Token enriquecido exitosamente: ${event.name || event.symbol || mint.substring(0, 8)}...`);
                        // Emitir evento actualizado
                        console.log(`📡 Emitiendo eventos 'token_updated' y 'token_event'...`);
                        this.emit('token_updated', event);
                        this.emit('token_event', event);
                        console.log(`✅ Eventos emitidos correctamente`);
                    }
                    else {
                        console.log(`⚠️ No se actualizó ningún campo con pump.fun API`);
                    }
                    return; // Éxito, salir
                }
                else {
                    console.log(`❌ pump.fun API respondió con error: ${response.status}`);
                }
            }
            catch (pumpError) {
                console.error(`❌ pump.fun API falló para ${mint.substring(0, 8)}...:`);
                console.error(`   Error: ${pumpError.message}`);
                console.error(`   Stack: ${pumpError.stack}`);
            }
            // Método 2: Intentar obtener de DexScreener como fallback
            console.log(`\n🔄 Método 2: Intentando DexScreener API...`);
            console.log(`📡 URL: https://api.dexscreener.com/latest/dex/tokens/${mint}`);
            try {
                const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
                const dexResponse = await fetch(dexUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json',
                    },
                });
                console.log(`📥 DexScreener response status: ${dexResponse.status} ${dexResponse.statusText}`);
                if (dexResponse.ok) {
                    const dexData = await dexResponse.json();
                    console.log(`✅ DexScreener API respuesta exitosa:`);
                    console.log(`📦 Data recibida:`, JSON.stringify(dexData, null, 2));
                    if (dexData.pairs && dexData.pairs.length > 0) {
                        const pair = dexData.pairs[0];
                        console.log(`📌 Usando primer pair encontrado`);
                        let updated = false;
                        if (pair.baseToken) {
                            if (pair.baseToken.name && !event.name) {
                                console.log(`✅ Nombre encontrado en DexScreener: "${pair.baseToken.name}"`);
                                event.name = pair.baseToken.name;
                                updated = true;
                            }
                            if (pair.baseToken.symbol && !event.symbol) {
                                console.log(`✅ Símbolo encontrado en DexScreener: "${pair.baseToken.symbol}"`);
                                event.symbol = pair.baseToken.symbol;
                                updated = true;
                            }
                        }
                        event.price = pair.priceUsd ? parseFloat(pair.priceUsd) : undefined;
                        event.volume = pair.volume?.h24 ? parseFloat(pair.volume.h24) : undefined;
                        event.liquidity = pair.liquidity?.usd ? parseFloat(pair.liquidity.usd) : undefined;
                        event.marketCap = pair.marketCap ? parseFloat(pair.marketCap) : undefined;
                        if (event.name || event.symbol) {
                            console.log(`✅ Token enriquecido desde DexScreener: ${event.name || event.symbol || mint.substring(0, 8)}...`);
                            console.log(`📡 Emitiendo eventos 'token_updated' y 'token_event'...`);
                            this.emit('token_updated', event);
                            this.emit('token_event', event);
                            console.log(`✅ Eventos emitidos correctamente`);
                            return;
                        }
                        else {
                            console.log(`⚠️ DexScreener no proporcionó nombre ni símbolo`);
                        }
                    }
                    else {
                        console.log(`⚠️ DexScreener no encontró pares para este token`);
                    }
                }
                else {
                    console.log(`❌ DexScreener API respondió con error: ${dexResponse.status}`);
                }
            }
            catch (dexError) {
                console.error(`❌ DexScreener API falló para ${mint.substring(0, 8)}...:`);
                console.error(`   Error: ${dexError.message}`);
            }
            // SIEMPRE emitir evento actualizado, incluso sin enriquecimiento
            console.log(`\n⚠️ ========== RESUMEN FINAL ==========`);
            console.log(`❌ No se pudo enriquecer token ${mint.substring(0, 8)}... con APIs externas`);
            console.log(`📊 Evento final:`, JSON.stringify(event, null, 2));
            console.log(`📡 Emitiendo evento 'token_updated' con datos actuales...`);
            // Emitir evento actualizado incluso si no se enriqueció (mantiene nombre temporal)
            this.emit('token_updated', event);
            this.emit('token_event', event);
            console.log(`✅ Evento emitido (con o sin enriquecimiento)`);
            console.log(`${'='.repeat(80)}\n`);
        }
        catch (error) {
            console.error(`\n❌ ========== ERROR CRÍTICO EN ENRIQUECIMIENTO ==========`);
            console.error(`❌ Error enriqueciendo token ${mint.substring(0, 8)}...:`);
            console.error(`   Error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            // Incluso con error, emitir el evento para notificar al frontend
            console.log(`📡 Emitiendo evento 'token_updated' a pesar del error...`);
            this.emit('token_updated', event);
            this.emit('token_event', event);
            console.log(`✅ Evento emitido`);
            console.log(`${'='.repeat(80)}\n`);
        }
    }
    /**
     * Detener la suscripción
     */
    async stop() {
        if (!this.isListening) {
            return;
        }
        try {
            if (this.logSubscriptionId !== null) {
                await this.connection.removeOnLogsListener(this.logSubscriptionId);
                this.logSubscriptionId = null;
            }
            if (this.accountSubscriptionId !== null) {
                await this.connection.removeAccountChangeListener(this.accountSubscriptionId);
                this.accountSubscriptionId = null;
            }
            this.isListening = false;
            this.recentTokens.clear();
            console.log('🛑 PumpFun Realtime Listener detenido');
        }
        catch (error) {
            console.error('Error deteniendo listener:', error);
        }
    }
    /**
     * Verificar si está escuchando
     */
    getIsListening() {
        return this.isListening;
    }
}
exports.PumpFunRealtimeListener = PumpFunRealtimeListener;
