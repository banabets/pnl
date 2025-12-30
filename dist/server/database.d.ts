import mongoose from 'mongoose';
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export declare const User: mongoose.Model<{
    id: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    username: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate;
    profile?: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    };
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        };
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        };
    };
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    };
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    id: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    username: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate;
    profile?: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    };
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        };
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        };
    };
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    };
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    id: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    username: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate;
    profile?: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    };
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        };
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        };
    };
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    };
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    id: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    username: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate;
    profile?: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    };
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        };
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        };
    };
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    };
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    id: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    username: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate;
    profile?: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    };
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        };
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        };
    };
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    };
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    id: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    username: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate;
    profile?: {
        displayName?: string;
        bio?: string;
        avatar?: string;
        timezone?: string;
        language?: string;
    };
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        };
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        };
    };
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    };
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Session: mongoose.Model<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    ipAddress?: string;
    userAgent?: string;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    ipAddress?: string;
    userAgent?: string;
}, {}, mongoose.DefaultSchemaOptions> & {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    ipAddress?: string;
    userAgent?: string;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    ipAddress?: string;
    userAgent?: string;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    ipAddress?: string;
    userAgent?: string;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    ipAddress?: string;
    userAgent?: string;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Wallet: mongoose.Model<{
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    index: number;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    index: number;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    index: number;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    index: number;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    index: number;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    index: number;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const MasterWallet: mongoose.Model<{
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    publicKey: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Position: mongoose.Model<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
    status: "open" | "closed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    entryPrice: number;
    entryAmount: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    status: "open" | "closed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    entryPrice: number;
    entryAmount: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    status: "open" | "closed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    entryPrice: number;
    entryAmount: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    status: "open" | "closed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    entryPrice: number;
    entryAmount: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
    status: "open" | "closed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    entryPrice: number;
    entryAmount: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
    status: "open" | "closed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    entryPrice: number;
    entryAmount: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Trade: mongoose.Model<{
    signature: string;
    price: number;
    solAmount: number;
    tokenAmount: number;
    timestamp: NativeDate;
    status: "confirmed" | "pending" | "failed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    tradeType: "buy" | "sell";
    tokenName?: string;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    signature: string;
    price: number;
    solAmount: number;
    tokenAmount: number;
    timestamp: NativeDate;
    status: "confirmed" | "pending" | "failed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    tradeType: "buy" | "sell";
    tokenName?: string;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    signature: string;
    price: number;
    solAmount: number;
    tokenAmount: number;
    timestamp: NativeDate;
    status: "confirmed" | "pending" | "failed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    tradeType: "buy" | "sell";
    tokenName?: string;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    signature: string;
    price: number;
    solAmount: number;
    tokenAmount: number;
    timestamp: NativeDate;
    status: "confirmed" | "pending" | "failed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    tradeType: "buy" | "sell";
    tokenName?: string;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    signature: string;
    price: number;
    solAmount: number;
    tokenAmount: number;
    timestamp: NativeDate;
    status: "confirmed" | "pending" | "failed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    tradeType: "buy" | "sell";
    tokenName?: string;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    signature: string;
    price: number;
    solAmount: number;
    tokenAmount: number;
    timestamp: NativeDate;
    status: "confirmed" | "pending" | "failed";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    tradeType: "buy" | "sell";
    tokenName?: string;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const StopLossOrder: mongoose.Model<{
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number;
    executedAt?: NativeDate;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number;
    executedAt?: NativeDate;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number;
    executedAt?: NativeDate;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number;
    executedAt?: NativeDate;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number;
    executedAt?: NativeDate;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number;
    executedAt?: NativeDate;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const PriceAlert: mongoose.Model<{
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const ActivityLog: mongoose.Model<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const TradingFee: mongoose.Model<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string;
    tradeId?: mongoose.Types.ObjectId;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string;
    tradeId?: mongoose.Types.ObjectId;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string;
    tradeId?: mongoose.Types.ObjectId;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string;
    tradeId?: mongoose.Types.ObjectId;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string;
    tradeId?: mongoose.Types.ObjectId;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string;
    tradeId?: mongoose.Types.ObjectId;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Subscription: mongoose.Model<{
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    };
    endDate?: NativeDate;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    };
    endDate?: NativeDate;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    };
    endDate?: NativeDate;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    };
    endDate?: NativeDate;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    };
    endDate?: NativeDate;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    };
    endDate?: NativeDate;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Referral: mongoose.Model<{
    createdAt: NativeDate;
    status: "active" | "pending" | "paid";
    referrerId: mongoose.Types.ObjectId;
    referredId: mongoose.Types.ObjectId;
    code: string;
    commissionPercent: number;
    totalEarned: number;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    status: "active" | "pending" | "paid";
    referrerId: mongoose.Types.ObjectId;
    referredId: mongoose.Types.ObjectId;
    code: string;
    commissionPercent: number;
    totalEarned: number;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    createdAt: NativeDate;
    status: "active" | "pending" | "paid";
    referrerId: mongoose.Types.ObjectId;
    referredId: mongoose.Types.ObjectId;
    code: string;
    commissionPercent: number;
    totalEarned: number;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    createdAt: NativeDate;
    status: "active" | "pending" | "paid";
    referrerId: mongoose.Types.ObjectId;
    referredId: mongoose.Types.ObjectId;
    code: string;
    commissionPercent: number;
    totalEarned: number;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    status: "active" | "pending" | "paid";
    referrerId: mongoose.Types.ObjectId;
    referredId: mongoose.Types.ObjectId;
    code: string;
    commissionPercent: number;
    totalEarned: number;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    status: "active" | "pending" | "paid";
    referrerId: mongoose.Types.ObjectId;
    referredId: mongoose.Types.ObjectId;
    code: string;
    commissionPercent: number;
    totalEarned: number;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const TokenIndex: mongoose.Model<{
    mint: string;
    createdAt: NativeDate;
    isNew: boolean;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string;
    bondingCurve?: string;
    name?: string;
    price?: number;
    imageUrl?: string;
    creator?: string;
    marketCap?: number;
    liquidity?: number;
    volume24h?: number;
    volume1h?: number;
    volume5m?: number;
    holders?: number;
    supply?: number;
    priceChange5m?: number;
    priceChange1h?: number;
    priceChange24h?: number;
    lastEnrichedAt?: NativeDate;
    enrichmentSource?: string;
    riskScore?: number;
    pairAddress?: string;
    dexId?: string;
    age?: number;
    txns5m?: {
        buys?: number;
        sells?: number;
    };
    txns1h?: {
        buys?: number;
        sells?: number;
    };
    txns24h?: {
        buys?: number;
        sells?: number;
    };
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    mint: string;
    createdAt: NativeDate;
    isNew: boolean;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string;
    bondingCurve?: string;
    name?: string;
    price?: number;
    imageUrl?: string;
    creator?: string;
    marketCap?: number;
    liquidity?: number;
    volume24h?: number;
    volume1h?: number;
    volume5m?: number;
    holders?: number;
    supply?: number;
    priceChange5m?: number;
    priceChange1h?: number;
    priceChange24h?: number;
    lastEnrichedAt?: NativeDate;
    enrichmentSource?: string;
    riskScore?: number;
    pairAddress?: string;
    dexId?: string;
    age?: number;
    txns5m?: {
        buys?: number;
        sells?: number;
    };
    txns1h?: {
        buys?: number;
        sells?: number;
    };
    txns24h?: {
        buys?: number;
        sells?: number;
    };
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    mint: string;
    createdAt: NativeDate;
    isNew: boolean;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string;
    bondingCurve?: string;
    name?: string;
    price?: number;
    imageUrl?: string;
    creator?: string;
    marketCap?: number;
    liquidity?: number;
    volume24h?: number;
    volume1h?: number;
    volume5m?: number;
    holders?: number;
    supply?: number;
    priceChange5m?: number;
    priceChange1h?: number;
    priceChange24h?: number;
    lastEnrichedAt?: NativeDate;
    enrichmentSource?: string;
    riskScore?: number;
    pairAddress?: string;
    dexId?: string;
    age?: number;
    txns5m?: {
        buys?: number;
        sells?: number;
    };
    txns1h?: {
        buys?: number;
        sells?: number;
    };
    txns24h?: {
        buys?: number;
        sells?: number;
    };
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    mint: string;
    createdAt: NativeDate;
    isNew: boolean;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string;
    bondingCurve?: string;
    name?: string;
    price?: number;
    imageUrl?: string;
    creator?: string;
    marketCap?: number;
    liquidity?: number;
    volume24h?: number;
    volume1h?: number;
    volume5m?: number;
    holders?: number;
    supply?: number;
    priceChange5m?: number;
    priceChange1h?: number;
    priceChange24h?: number;
    lastEnrichedAt?: NativeDate;
    enrichmentSource?: string;
    riskScore?: number;
    pairAddress?: string;
    dexId?: string;
    age?: number;
    txns5m?: {
        buys?: number;
        sells?: number;
    };
    txns1h?: {
        buys?: number;
        sells?: number;
    };
    txns24h?: {
        buys?: number;
        sells?: number;
    };
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    mint: string;
    createdAt: NativeDate;
    isNew: boolean;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string;
    bondingCurve?: string;
    name?: string;
    price?: number;
    imageUrl?: string;
    creator?: string;
    marketCap?: number;
    liquidity?: number;
    volume24h?: number;
    volume1h?: number;
    volume5m?: number;
    holders?: number;
    supply?: number;
    priceChange5m?: number;
    priceChange1h?: number;
    priceChange24h?: number;
    lastEnrichedAt?: NativeDate;
    enrichmentSource?: string;
    riskScore?: number;
    pairAddress?: string;
    dexId?: string;
    age?: number;
    txns5m?: {
        buys?: number;
        sells?: number;
    };
    txns1h?: {
        buys?: number;
        sells?: number;
    };
    txns24h?: {
        buys?: number;
        sells?: number;
    };
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    mint: string;
    createdAt: NativeDate;
    isNew: boolean;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string;
    bondingCurve?: string;
    name?: string;
    price?: number;
    imageUrl?: string;
    creator?: string;
    marketCap?: number;
    liquidity?: number;
    volume24h?: number;
    volume1h?: number;
    volume5m?: number;
    holders?: number;
    supply?: number;
    priceChange5m?: number;
    priceChange1h?: number;
    priceChange24h?: number;
    lastEnrichedAt?: NativeDate;
    enrichmentSource?: string;
    riskScore?: number;
    pairAddress?: string;
    dexId?: string;
    age?: number;
    txns5m?: {
        buys?: number;
        sells?: number;
    };
    txns1h?: {
        buys?: number;
        sells?: number;
    };
    txns24h?: {
        buys?: number;
        sells?: number;
    };
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare function isConnected(): boolean;
//# sourceMappingURL=database.d.ts.map