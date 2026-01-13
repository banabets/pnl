"use strict";
/**
 * Pagination Utilities
 * Helper functions for paginating data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = paginate;
exports.getPaginationParams = getPaginationParams;
/**
 * Paginate an array of data
 */
function paginate(data, params, sortFn) {
    const { page, limit, sortBy, sortOrder } = params;
    // Sort data if sort function provided
    let sortedData = [...data];
    if (sortFn) {
        sortedData.sort(sortFn);
    }
    else if (sortBy) {
        sortedData.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }
    // Calculate pagination
    const total = sortedData.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedData = sortedData.slice(skip, skip + limit);
    return {
        data: paginatedData,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
/**
 * Create pagination metadata for database queries
 */
function getPaginationParams(params) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    return {
        skip,
        limit,
        page,
    };
}
//# sourceMappingURL=pagination.util.js.map