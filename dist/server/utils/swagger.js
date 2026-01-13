"use strict";
/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
exports.setupSwagger = setupSwagger;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PNL Trading Bot API',
            version: '1.0.0',
            description: 'API documentation for PNL Trading Bot - A secure and transparent Solana trading bot',
            contact: {
                name: 'PNL Team',
            },
            license: {
                name: 'MIT',
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://web-production-a1176.up.railway.app',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: { type: 'string' },
                                code: { type: 'string' },
                                statusCode: { type: 'number' },
                            },
                        },
                    },
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                        },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Wallets', description: 'Wallet management' },
            { name: 'Trading', description: 'Trading operations' },
            { name: 'Tokens', description: 'Token discovery and information' },
            { name: 'Portfolio', description: 'Portfolio tracking' },
            { name: 'Alerts', description: 'Price alerts' },
            { name: 'Health', description: 'Health checks' },
        ],
    },
    apis: [
        './server/routes/*.ts',
        './server/controllers/*.ts',
        './server/index.ts',
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
function setupSwagger(app) {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(exports.swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'PNL Trading Bot API Documentation',
    }));
}
//# sourceMappingURL=swagger.js.map