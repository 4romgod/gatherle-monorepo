import type { PaginationInput } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from '../../exceptions';

export const MAX_QUERY_PAGE_SIZE = 50;

const clampQueryLimit = (value: number): number => {
  return Math.max(1, Math.min(MAX_QUERY_PAGE_SIZE, Math.trunc(value)));
};

const validatePaginationLimit = (limit?: number) => {
  if (typeof limit === 'undefined') {
    return MAX_QUERY_PAGE_SIZE;
  }

  if (!Number.isFinite(limit) || limit < 1 || limit > MAX_QUERY_PAGE_SIZE) {
    throw CustomError(`Pagination limit must be between 1 and ${MAX_QUERY_PAGE_SIZE}.`, ErrorTypes.BAD_REQUEST);
  }

  return limit;
};

const validatePaginationSkip = (skip?: number) => {
  if (typeof skip === 'undefined') {
    return;
  }

  if (!Number.isFinite(skip) || skip < 0) {
    throw CustomError('Pagination skip must be greater than or equal to 0.', ErrorTypes.BAD_REQUEST);
  }

  return skip;
};

export const sanitizeQueryLimit = (limit: number | null | undefined, defaultValue: number = 5): number => {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return clampQueryLimit(limit);
  }

  if (typeof defaultValue === 'number' && Number.isFinite(defaultValue)) {
    return clampQueryLimit(defaultValue);
  }

  return 1;
};

export const validatePaginationInput = (paginationInput: PaginationInput) => ({
  skip: validatePaginationSkip(paginationInput.skip),
  limit: validatePaginationLimit(paginationInput.limit),
});
