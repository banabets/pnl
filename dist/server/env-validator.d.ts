interface EnvValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Validates all required environment variables
 * Throws error if critical variables are missing or invalid
 */
export declare function validateEnvironment(): EnvValidationResult;
/**
 * Generate secure environment variables for new installations
 */
export declare function generateSecureEnvVars(): {
    JWT_SECRET: string;
    ENCRYPTION_KEY: string;
};
/**
 * Validate and throw error if environment is invalid
 * Use this at the start of your application
 */
export declare function validateOrThrow(): void;
export declare function getValidatedRpcUrl(): string;
export {};
//# sourceMappingURL=env-validator.d.ts.map