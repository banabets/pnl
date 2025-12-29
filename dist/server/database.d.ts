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
export declare function isConnected(): boolean;
//# sourceMappingURL=database.d.ts.map