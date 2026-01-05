"use strict";
// Discord Interactions Handler
// Handles Discord Slash Commands and Interactions
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDiscordSignature = verifyDiscordSignature;
exports.handleDiscordInteraction = handleDiscordInteraction;
const nacl = __importStar(require("tweetnacl"));
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
/**
 * Verify Discord interaction signature (Ed25519)
 */
function verifyDiscordSignature(body, signature, timestamp) {
    if (!DISCORD_PUBLIC_KEY) {
        console.warn('⚠️ DISCORD_PUBLIC_KEY not set, skipping signature verification');
        return true; // Allow in development
    }
    if (!signature || !timestamp) {
        console.error('Missing signature or timestamp');
        return false;
    }
    try {
        // Discord uses Ed25519 signatures
        // The message is: timestamp + body (as string)
        const message = Buffer.from(timestamp + body, 'utf8');
        // Signature is hex-encoded
        const signatureBuffer = Buffer.from(signature, 'hex');
        // Public key is hex-encoded (64 characters = 32 bytes)
        const publicKeyBuffer = Buffer.from(DISCORD_PUBLIC_KEY, 'hex');
        if (signatureBuffer.length !== 64) {
            console.error(`Invalid signature length: ${signatureBuffer.length}, expected 64`);
            return false;
        }
        if (publicKeyBuffer.length !== 32) {
            console.error(`Invalid public key length: ${publicKeyBuffer.length}, expected 32`);
            return false;
        }
        const isValid = nacl.sign.detached.verify(message, signatureBuffer, publicKeyBuffer);
        if (!isValid) {
            console.error('Signature verification failed');
            console.error('Message length:', message.length);
            console.error('Signature (first 16 chars):', signature.substring(0, 16));
            console.error('Public key (first 16 chars):', DISCORD_PUBLIC_KEY.substring(0, 16));
        }
        return isValid;
    }
    catch (error) {
        console.error('Error verifying Discord signature:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return false;
    }
}
/**
 * Handle Discord interaction
 */
async function handleDiscordInteraction(req, res, tokenFeed, rawBody) {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing signature headers' });
    }
    // Use provided raw body or stringify parsed body
    const bodyString = rawBody || JSON.stringify(req.body);
    // Verify signature
    if (!verifyDiscordSignature(bodyString, signature, timestamp)) {
        console.error('Invalid Discord signature. Public key set:', !!process.env.DISCORD_PUBLIC_KEY);
        return res.status(401).json({ error: 'Invalid signature' });
    }
    const interaction = req.body;
    // Handle PING (Discord verification)
    if (interaction.type === 1) {
        return res.json({ type: 1 }); // PONG
    }
    // Handle APPLICATION_COMMAND (Slash Commands)
    if (interaction.type === 2) {
        const command = interaction.data?.name;
        if (command === 'token' || command === 't') {
            const mint = interaction.data?.options?.[0]?.value;
            if (!mint) {
                return res.json({
                    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                    data: {
                        content: '❌ Por favor proporciona una dirección de mint.',
                        flags: 64, // EPHEMERAL
                    },
                });
            }
            // Validate mint address format
            if (mint.length < 32 || mint.length > 44) {
                return res.json({
                    type: 4,
                    data: {
                        content: '❌ Dirección de mint inválida. Debe tener entre 32 y 44 caracteres.',
                        flags: 64,
                    },
                });
            }
            try {
                // Fetch token data from API
                const token = await tokenFeed.getToken(mint);
                if (!token) {
                    // Try MongoDB fallback
                    const { tokenIndexer } = await Promise.resolve().then(() => __importStar(require('./token-indexer')));
                    if (tokenIndexer.isActive()) {
                        const dbToken = await tokenIndexer.getToken(mint);
                        if (dbToken) {
                            // Convert to TokenData format
                            const convertedToken = {
                                mint: dbToken.mint,
                                name: dbToken.name || `Token ${dbToken.mint.slice(0, 8)}`,
                                symbol: dbToken.symbol || 'UNK',
                                imageUrl: dbToken.imageUrl,
                                price: dbToken.price || 0,
                                priceChange5m: dbToken.priceChange5m || 0,
                                priceChange1h: dbToken.priceChange1h || 0,
                                priceChange24h: dbToken.priceChange24h || 0,
                                volume5m: dbToken.volume5m || 0,
                                volume1h: dbToken.volume1h || 0,
                                volume24h: dbToken.volume24h || 0,
                                liquidity: dbToken.liquidity || 0,
                                marketCap: dbToken.marketCap || 0,
                                fdv: dbToken.marketCap || 0,
                                holders: dbToken.holders,
                                txns5m: dbToken.txns5m || { buys: 0, sells: 0 },
                                txns1h: dbToken.txns1h || { buys: 0, sells: 0 },
                                txns24h: dbToken.txns24h || { buys: 0, sells: 0 },
                                createdAt: dbToken.createdAt,
                                pairAddress: dbToken.pairAddress || '',
                                dexId: dbToken.dexId || 'unknown',
                                age: dbToken.age || 0,
                                isNew: dbToken.isNew || false,
                                isGraduating: dbToken.isGraduating || false,
                                isTrending: dbToken.isTrending || false,
                                riskScore: dbToken.riskScore || 50,
                            };
                            return formatTokenResponse(res, convertedToken);
                        }
                    }
                    return res.json({
                        type: 4,
                        data: {
                            content: `❌ Token no encontrado: \`${mint.substring(0, 8)}...\``,
                            flags: 64,
                        },
                    });
                }
                return formatTokenResponse(res, token);
            }
            catch (error) {
                console.error('Error fetching token:', error);
                return res.json({
                    type: 4,
                    data: {
                        content: '❌ Error al buscar el token. Intenta de nuevo más tarde.',
                        flags: 64,
                    },
                });
            }
        }
    }
    // Unknown command
    return res.json({
        type: 4,
        data: {
            content: '❌ Comando no reconocido.',
            flags: 64,
        },
    });
}
/**
 * Format token data as Discord embed response
 */
function formatTokenResponse(res, token) {
    const embed = {
        title: `${token.name || 'Unknown Token'} (${token.symbol || 'UNK'})`,
        description: 'Información completa del token',
        color: token.isNew ? 65280 : token.isGraduating ? 16755200 : 39717, // Green, Orange, Blue
        thumbnail: token.imageUrl ? { url: token.imageUrl } : undefined,
        fields: [
            {
                name: '💰 Precio',
                value: `$${token.price?.toFixed(6) || '0.000000'}`,
                inline: true,
            },
            {
                name: '📊 Market Cap',
                value: `$${(token.marketCap / 1000).toFixed(1)}K`,
                inline: true,
            },
            {
                name: '💧 Liquidez',
                value: `$${(token.liquidity / 1000).toFixed(1)}K`,
                inline: true,
            },
            {
                name: '📈 Cambio 24h',
                value: `${token.priceChange24h >= 0 ? '🟢' : '🔴'} ${token.priceChange24h?.toFixed(2) || '0.00'}%`,
                inline: true,
            },
            {
                name: '📈 Cambio 1h',
                value: `${token.priceChange1h >= 0 ? '🟢' : '🔴'} ${token.priceChange1h?.toFixed(2) || '0.00'}%`,
                inline: true,
            },
            {
                name: '👥 Holders',
                value: token.holders?.toString() || 'N/A',
                inline: true,
            },
            {
                name: '📊 Volumen 24h',
                value: `$${(token.volume24h / 1000).toFixed(1)}K`,
                inline: true,
            },
            {
                name: '🔄 Transacciones 24h',
                value: `${(token.txns24h?.buys || 0) + (token.txns24h?.sells || 0)}`,
                inline: true,
            },
            {
                name: '⏰ Edad',
                value: token.age < 60 ? `${token.age} min` : `${(token.age / 60).toFixed(1)} horas`,
                inline: true,
            },
            {
                name: '🏷️ DEX',
                value: token.dexId?.toUpperCase() || 'UNKNOWN',
                inline: true,
            },
            {
                name: '⚠️ Risk Score',
                value: `${token.riskScore || 50}/100`,
                inline: true,
            },
            {
                name: '🏅 Estado',
                value: [
                    token.isNew ? '🆕 Nuevo' : '',
                    token.isGraduating ? '🎓 Graduando' : '',
                    token.isTrending ? '🔥 Trending' : '',
                ]
                    .filter(Boolean)
                    .join(' ') || 'Normal',
                inline: true,
            },
            {
                name: '🔗 Enlaces',
                value: [
                    `[DexScreener](https://dexscreener.com/solana/${token.pairAddress || token.mint})`,
                    `[Birdeye](https://birdeye.so/token/${token.mint})`,
                    `[Solscan](https://solscan.io/token/${token.mint})`,
                ].join(' • '),
                inline: false,
            },
        ],
        footer: {
            text: `Mint: ${token.mint.substring(0, 8)}...${token.mint.slice(-4)}`,
            icon_url: token.imageUrl || undefined,
        },
        timestamp: new Date().toISOString(),
    };
    res.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
            embeds: [embed],
        },
    });
}
//# sourceMappingURL=discord-interactions.js.map