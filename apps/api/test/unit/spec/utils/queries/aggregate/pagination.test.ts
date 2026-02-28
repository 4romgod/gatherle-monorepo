import type { PaginationInput } from '@gatherle/commons/types';
import { MAX_QUERY_PAGE_SIZE, createPaginationStages } from '@/utils';

describe('createPaginationStages', () => {
  it('should return a valid pagination pipeline when valid pagination inputs are provided', () => {
    const paginationInput: PaginationInput = { limit: 6, skip: 3 };
    const paginationOptions = createPaginationStages(paginationInput);
    const expectedResults = [{ $skip: 3 }, { $limit: 6 }];
    expect(paginationOptions).toEqual(expectedResults);
  });

  it('should apply the default max page size when no limit is provided', () => {
    const paginationOptions = createPaginationStages({});
    expect(paginationOptions).toEqual([{ $limit: MAX_QUERY_PAGE_SIZE }]);
  });

  it('should apply the default max page size and skip the zero skip', () => {
    const paginationInput: PaginationInput = { skip: 0 };
    const paginationOptions = createPaginationStages(paginationInput);
    expect(paginationOptions).toEqual([{ $limit: MAX_QUERY_PAGE_SIZE }]);
  });

  it('should throw when limit exceeds the maximum page size', () => {
    const paginationInput: PaginationInput = { limit: MAX_QUERY_PAGE_SIZE + 1, skip: 1 };

    expect(() => createPaginationStages(paginationInput)).toThrow(
      `Pagination limit must be between 1 and ${MAX_QUERY_PAGE_SIZE}.`,
    );
  });

  it('should throw when limit is not positive', () => {
    const paginationInput: PaginationInput = { limit: 0 };

    expect(() => createPaginationStages(paginationInput)).toThrow(
      `Pagination limit must be between 1 and ${MAX_QUERY_PAGE_SIZE}.`,
    );
  });

  it('should throw when skip is negative', () => {
    const paginationInput: PaginationInput = { limit: 5, skip: -1 };

    expect(() => createPaginationStages(paginationInput)).toThrow(
      'Pagination skip must be greater than or equal to 0.',
    );
  });
});
