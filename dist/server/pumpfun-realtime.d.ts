import { EventEmitter } from 'events';
export interface PumpFunTokenEvent {
    type: 'new_token' | 'trade' | 'update';
    mint: string;
    name?: string;
    symbol?: string;
    signature: string;
    timestamp: number;
    creator?: string;
    bondingCurve?: string;
    price?: number;
    volume?: number;
    liquidity?: number;
    marketCap?: number;
    holders?: number;
}
export declare class PumpFunRealtimeListener extends EventEmitter {
    private connection;
    private isListening;
    private logSubscriptionId;
    private accountSubscriptionId;
    private recentTokens;
    private readonly DEDUP_WINDOW;
    constructor(rpcUrl?: string);
    /**
     * Iniciar suscripción en tiempo real al programa de pump.fun
     */
    start(): Promise<void>;
    /**
     * Procesar una transacción para extraer información del token
     */
    private processTransaction;
    /**
     * Enriquecer información del token (nombre, símbolo, precio, etc.)
     */
    private enrichTokenInfo;
    /**
     * Detener la suscripción
     */
    stop(): Promise<void>;
    /**
     * Verificar si está escuchando
     */
    getIsListening(): boolean;
}
//# sourceMappingURL=pumpfun-realtime.d.ts.map