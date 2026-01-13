"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
/**
 * Validate request body against Zod schema
 */
function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Validation error',
                        code: 'VALIDATION_ERROR',
                        details,
                    },
                });
            }
            next(error);
        }
    };
}
/**
 * Validate request query parameters
 */
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Query validation error',
                        code: 'VALIDATION_ERROR',
                        details,
                    },
                });
            }
            next(error);
        }
    };
}
/**
 * Validate request params
 */
function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Parameter validation error',
                        code: 'VALIDATION_ERROR',
                        details,
                    },
                });
            }
            next(error);
        }
    };
}
//# sourceMappingURL=validation.middleware.js.map