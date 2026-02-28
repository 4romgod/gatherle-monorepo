import type { PaginationInput } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from '../../exceptions';

export const MAX_QUERY_PAGE_SIZE = 50;

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

export const validatePaginationInput = (paginationInput: PaginationInput) => ({
  skip: validatePaginationSkip(paginationInput.skip),
  limit: validatePaginationLimit(paginationInput.limit),
});
