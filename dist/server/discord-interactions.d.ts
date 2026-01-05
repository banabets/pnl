/**
 * Verify Discord interaction signature (Ed25519)
 */
export declare function verifyDiscordSignature(body: string, signature: string, timestamp: string): boolean;
/**
 * Handle Discord interaction
 */
export declare function handleDiscordInteraction(req: any, res: any, tokenFeed: any): Promise<void>;
//# sourceMappingURL=discord-interactions.d.ts.map