import {PaginationInput} from '@/graphql/types';
import {createPaginationStages} from '@/utils';

describe('createPaginationStages', () => {
  it('should return a valid pagination pipeline when valid pagination inputs are provided', () => {
    const paginationInput: PaginationInput = {limit: 6, skip: 3};
    const paginationOptions = createPaginationStages(paginationInput);
    const expectedResults = [{$skip: 3}, {$limit: 6}];
    expect(paginationOptions).toEqual(expectedResults);
  });

  it('should return an empty array when empty pagination inputs are provided', () => {
    const paginationOptions = createPaginationStages({});
    expect(paginationOptions).toEqual([]);
  });

  it('should return an empty array when limit and skip are zero', () => {
    const paginationInput: PaginationInput = {limit: 0, skip: 0};
    const paginationOptions = createPaginationStages(paginationInput);
    expect(paginationOptions).toEqual([]);
  });
});
