import mongoose from 'mongoose';
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export declare const User: mongoose.Model<{
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate | null | undefined;
    profile?: {
        displayName?: string | null | undefined;
        bio?: string | null | undefined;
        avatar?: string | null | undefined;
        timezone?: string | null | undefined;
        language?: string | null | undefined;
    } | null | undefined;
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        } | null | undefined;
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        } | null | undefined;
    } | null | undefined;
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    } | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate | null | undefined;
    profile?: {
        displayName?: string | null | undefined;
        bio?: string | null | undefined;
        avatar?: string | null | undefined;
        timezone?: string | null | undefined;
        language?: string | null | undefined;
    } | null | undefined;
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        } | null | undefined;
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        } | null | undefined;
    } | null | undefined;
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    } | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate | null | undefined;
    profile?: {
        displayName?: string | null | undefined;
        bio?: string | null | undefined;
        avatar?: string | null | undefined;
        timezone?: string | null | undefined;
        language?: string | null | undefined;
    } | null | undefined;
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        } | null | undefined;
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        } | null | undefined;
    } | null | undefined;
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    } | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate | null | undefined;
    profile?: {
        displayName?: string | null | undefined;
        bio?: string | null | undefined;
        avatar?: string | null | undefined;
        timezone?: string | null | undefined;
        language?: string | null | undefined;
    } | null | undefined;
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        } | null | undefined;
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        } | null | undefined;
    } | null | undefined;
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    } | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate | null | undefined;
    profile?: {
        displayName?: string | null | undefined;
        bio?: string | null | undefined;
        avatar?: string | null | undefined;
        timezone?: string | null | undefined;
        language?: string | null | undefined;
    } | null | undefined;
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        } | null | undefined;
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        } | null | undefined;
    } | null | undefined;
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    } | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    emailVerified: boolean;
    role: "user" | "admin" | "premium";
    status: "active" | "suspended" | "banned";
    lastLogin?: NativeDate | null | undefined;
    profile?: {
        displayName?: string | null | undefined;
        bio?: string | null | undefined;
        avatar?: string | null | undefined;
        timezone?: string | null | undefined;
        language?: string | null | undefined;
    } | null | undefined;
    settings?: {
        theme: "light" | "dark" | "auto";
        notifications?: {
            email: boolean;
            priceAlerts: boolean;
            tradeAlerts: boolean;
        } | null | undefined;
        trading?: {
            defaultSlippage: number;
            defaultWalletIndex: number;
        } | null | undefined;
    } | null | undefined;
    stats?: {
        totalTrades: number;
        totalVolume: number;
        totalProfit: number;
        winRate: number;
    } | null | undefined;
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
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
}, {}, mongoose.DefaultSchemaOptions> & {
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
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
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    token: string;
    lastActive: NativeDate;
    expiresAt: NativeDate;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const Wallet: mongoose.Model<{
    publicKey: string;
    index: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    publicKey: string;
    index: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    publicKey: string;
    index: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    publicKey: string;
    index: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    publicKey: string;
    index: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    publicKey: string;
    index: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    encryptedPrivateKey: string;
    balance: number;
    isActive: boolean;
    label?: string | null | undefined;
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
    tokenName?: string | null | undefined;
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
    tokenName?: string | null | undefined;
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
    tokenName?: string | null | undefined;
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
    tokenName?: string | null | undefined;
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
    tokenName?: string | null | undefined;
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
    tokenName?: string | null | undefined;
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
    amount?: number | null | undefined;
    executedAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number | null | undefined;
    executedAt?: NativeDate | null | undefined;
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
    amount?: number | null | undefined;
    executedAt?: NativeDate | null | undefined;
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
    amount?: number | null | undefined;
    executedAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    type: "stop-loss" | "take-profit" | "trailing-stop";
    createdAt: NativeDate;
    status: "active" | "executed" | "cancelled";
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    walletIndex: number;
    triggerPrice: number;
    amount?: number | null | undefined;
    executedAt?: NativeDate | null | undefined;
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
    amount?: number | null | undefined;
    executedAt?: NativeDate | null | undefined;
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
    triggeredAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate | null | undefined;
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
    triggeredAt?: NativeDate | null | undefined;
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
    triggeredAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    type: "price" | "volume" | "market-cap";
    value: number;
    createdAt: NativeDate;
    active: boolean;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    condition: "above" | "below";
    triggeredAt?: NativeDate | null | undefined;
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
    triggeredAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const ActivityLog: mongoose.Model<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    details?: any;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    details?: any;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    details?: any;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
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
    details?: any;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    details?: any;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    action: string;
    details?: any;
    userAgent?: string | null | undefined;
    ipAddress?: string | null | undefined;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare const AuditLog: mongoose.Model<{
    timestamp: NativeDate;
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    error?: string | null | undefined;
    details?: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    timestamp: NativeDate;
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    error?: string | null | undefined;
    details?: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    timestamp: NativeDate;
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    error?: string | null | undefined;
    details?: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    timestamp: NativeDate;
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    error?: string | null | undefined;
    details?: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    error?: string | null | undefined;
    details?: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    error?: string | null | undefined;
    details?: any;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
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
    signature?: string | null | undefined;
    tradeId?: mongoose.Types.ObjectId | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string | null | undefined;
    tradeId?: mongoose.Types.ObjectId | null | undefined;
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
    signature?: string | null | undefined;
    tradeId?: mongoose.Types.ObjectId | null | undefined;
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
    signature?: string | null | undefined;
    tradeId?: mongoose.Types.ObjectId | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    timestamp: NativeDate;
    userId: mongoose.Types.ObjectId;
    tokenMint: string;
    tradeType: "buy" | "sell";
    tradeAmount: number;
    feePercent: number;
    feeAmount: number;
    feeCollected: boolean;
    signature?: string | null | undefined;
    tradeId?: mongoose.Types.ObjectId | null | undefined;
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
    signature?: string | null | undefined;
    tradeId?: mongoose.Types.ObjectId | null | undefined;
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
    paymentMethod?: string | null | undefined;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    } | null | undefined;
    endDate?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string | null | undefined;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    } | null | undefined;
    endDate?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string | null | undefined;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    } | null | undefined;
    endDate?: NativeDate | null | undefined;
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
    paymentMethod?: string | null | undefined;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    } | null | undefined;
    endDate?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string | null | undefined;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    } | null | undefined;
    endDate?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    userId: mongoose.Types.ObjectId;
    plan: "premium" | "free" | "basic" | "whale";
    feeDiscount: number;
    maxWallets: number;
    startDate: NativeDate;
    autoRenew: boolean;
    paymentMethod?: string | null | undefined;
    features?: {
        copyTrading: boolean;
        sniperBot: boolean;
        dcaBot: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
    } | null | undefined;
    endDate?: NativeDate | null | undefined;
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
    isNew: boolean;
    createdAt: NativeDate;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string | null | undefined;
    bondingCurve?: string | null | undefined;
    name?: string | null | undefined;
    price?: number | null | undefined;
    imageUrl?: string | null | undefined;
    creator?: string | null | undefined;
    marketCap?: number | null | undefined;
    liquidity?: number | null | undefined;
    volume24h?: number | null | undefined;
    volume1h?: number | null | undefined;
    volume5m?: number | null | undefined;
    holders?: number | null | undefined;
    supply?: number | null | undefined;
    priceChange5m?: number | null | undefined;
    priceChange1h?: number | null | undefined;
    priceChange24h?: number | null | undefined;
    lastEnrichedAt?: NativeDate | null | undefined;
    enrichmentSource?: string | null | undefined;
    riskScore?: number | null | undefined;
    pairAddress?: string | null | undefined;
    dexId?: string | null | undefined;
    age?: number | null | undefined;
    txns5m?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns1h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns24h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    mint: string;
    isNew: boolean;
    createdAt: NativeDate;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string | null | undefined;
    bondingCurve?: string | null | undefined;
    name?: string | null | undefined;
    price?: number | null | undefined;
    imageUrl?: string | null | undefined;
    creator?: string | null | undefined;
    marketCap?: number | null | undefined;
    liquidity?: number | null | undefined;
    volume24h?: number | null | undefined;
    volume1h?: number | null | undefined;
    volume5m?: number | null | undefined;
    holders?: number | null | undefined;
    supply?: number | null | undefined;
    priceChange5m?: number | null | undefined;
    priceChange1h?: number | null | undefined;
    priceChange24h?: number | null | undefined;
    lastEnrichedAt?: NativeDate | null | undefined;
    enrichmentSource?: string | null | undefined;
    riskScore?: number | null | undefined;
    pairAddress?: string | null | undefined;
    dexId?: string | null | undefined;
    age?: number | null | undefined;
    txns5m?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns1h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns24h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    mint: string;
    isNew: boolean;
    createdAt: NativeDate;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string | null | undefined;
    bondingCurve?: string | null | undefined;
    name?: string | null | undefined;
    price?: number | null | undefined;
    imageUrl?: string | null | undefined;
    creator?: string | null | undefined;
    marketCap?: number | null | undefined;
    liquidity?: number | null | undefined;
    volume24h?: number | null | undefined;
    volume1h?: number | null | undefined;
    volume5m?: number | null | undefined;
    holders?: number | null | undefined;
    supply?: number | null | undefined;
    priceChange5m?: number | null | undefined;
    priceChange1h?: number | null | undefined;
    priceChange24h?: number | null | undefined;
    lastEnrichedAt?: NativeDate | null | undefined;
    enrichmentSource?: string | null | undefined;
    riskScore?: number | null | undefined;
    pairAddress?: string | null | undefined;
    dexId?: string | null | undefined;
    age?: number | null | undefined;
    txns5m?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns1h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns24h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    mint: string;
    isNew: boolean;
    createdAt: NativeDate;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string | null | undefined;
    bondingCurve?: string | null | undefined;
    name?: string | null | undefined;
    price?: number | null | undefined;
    imageUrl?: string | null | undefined;
    creator?: string | null | undefined;
    marketCap?: number | null | undefined;
    liquidity?: number | null | undefined;
    volume24h?: number | null | undefined;
    volume1h?: number | null | undefined;
    volume5m?: number | null | undefined;
    holders?: number | null | undefined;
    supply?: number | null | undefined;
    priceChange5m?: number | null | undefined;
    priceChange1h?: number | null | undefined;
    priceChange24h?: number | null | undefined;
    lastEnrichedAt?: NativeDate | null | undefined;
    enrichmentSource?: string | null | undefined;
    riskScore?: number | null | undefined;
    pairAddress?: string | null | undefined;
    dexId?: string | null | undefined;
    age?: number | null | undefined;
    txns5m?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns1h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns24h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    mint: string;
    isNew: boolean;
    createdAt: NativeDate;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string | null | undefined;
    bondingCurve?: string | null | undefined;
    name?: string | null | undefined;
    price?: number | null | undefined;
    imageUrl?: string | null | undefined;
    creator?: string | null | undefined;
    marketCap?: number | null | undefined;
    liquidity?: number | null | undefined;
    volume24h?: number | null | undefined;
    volume1h?: number | null | undefined;
    volume5m?: number | null | undefined;
    holders?: number | null | undefined;
    supply?: number | null | undefined;
    priceChange5m?: number | null | undefined;
    priceChange1h?: number | null | undefined;
    priceChange24h?: number | null | undefined;
    lastEnrichedAt?: NativeDate | null | undefined;
    enrichmentSource?: string | null | undefined;
    riskScore?: number | null | undefined;
    pairAddress?: string | null | undefined;
    dexId?: string | null | undefined;
    age?: number | null | undefined;
    txns5m?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns1h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns24h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    mint: string;
    isNew: boolean;
    createdAt: NativeDate;
    source: "pumpfun" | "raydium" | "unknown";
    isGraduating: boolean;
    isTrending: boolean;
    symbol?: string | null | undefined;
    bondingCurve?: string | null | undefined;
    name?: string | null | undefined;
    price?: number | null | undefined;
    imageUrl?: string | null | undefined;
    creator?: string | null | undefined;
    marketCap?: number | null | undefined;
    liquidity?: number | null | undefined;
    volume24h?: number | null | undefined;
    volume1h?: number | null | undefined;
    volume5m?: number | null | undefined;
    holders?: number | null | undefined;
    supply?: number | null | undefined;
    priceChange5m?: number | null | undefined;
    priceChange1h?: number | null | undefined;
    priceChange24h?: number | null | undefined;
    lastEnrichedAt?: NativeDate | null | undefined;
    enrichmentSource?: string | null | undefined;
    riskScore?: number | null | undefined;
    pairAddress?: string | null | undefined;
    dexId?: string | null | undefined;
    age?: number | null | undefined;
    txns5m?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns1h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
    txns24h?: {
        buys?: number | null | undefined;
        sells?: number | null | undefined;
    } | null | undefined;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export declare function isConnected(): boolean;
//# sourceMappingURL=database.d.ts.map