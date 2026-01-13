/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
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

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PNL Trading Bot API Documentation',
  }));
}

