/**
 * Pagination Utilities
 * Helper functions for paginating data
 */
import { PaginationQuery } from '../validators/zod.validators';
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
/**
 * Paginate an array of data
 */
export declare function paginate<T>(data: T[], params: PaginationQuery, sortFn?: (a: T, b: T) => number): PaginatedResult<T>;
/**
 * Create pagination metadata for database queries
 */
export declare function getPaginationParams(params: PaginationQuery): {
    skip: number;
    limit: z.infer<any>;
    page: z.infer<any>;
};
//# sourceMappingURL=pagination.util.d.ts.map