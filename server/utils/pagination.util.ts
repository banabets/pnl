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
export function paginate<T>(
  data: T[],
  params: PaginationQuery,
  sortFn?: (a: T, b: T) => number
): PaginatedResult<T> {
  const { page, limit, sortBy, sortOrder } = params;

  // Sort data if sort function provided
  let sortedData = [...data];
  if (sortFn) {
    sortedData.sort(sortFn);
  } else if (sortBy) {
    sortedData.sort((a: any, b: any) => {
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
export function getPaginationParams(params: PaginationQuery) {
  const { page, limit } = params;
  const skip = (page - 1) * limit;

  return {
    skip,
    limit,
    page,
  };
}

