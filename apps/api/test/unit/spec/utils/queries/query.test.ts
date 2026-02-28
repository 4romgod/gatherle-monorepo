import type { Model, Query } from 'mongoose';
import {
  MAX_QUERY_PAGE_SIZE,
  addSortToQuery,
  addPaginationToQuery,
  addFiltersToQuery,
  transformOptionsToQuery,
} from '@/utils';
import type { FilterInput, SortInput } from '@gatherle/commons/types';
import { FilterOperatorInput, SortOrderInput } from '@gatherle/commons/types';

describe('Query', () => {
  describe('addSortToQuery', () => {
    it('should add sorting to the query', () => {
      const mockQuery = { sort: jest.fn() } as unknown as Query<any, any>;
      const sortInput: SortInput[] = [
        { field: 'name', order: SortOrderInput.asc },
        { field: 'age', order: SortOrderInput.desc },
      ];
      addSortToQuery(mockQuery, sortInput);
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1, age: -1 });
    });
  });

  describe('addPaginationToQuery', () => {
    it('should add skip and limit to the query', () => {
      const mockQuery = { skip: jest.fn(), limit: jest.fn() } as unknown as Query<any, any>;
      const paginationInput = { skip: 10, limit: 20 };
      addPaginationToQuery(mockQuery, paginationInput);
      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should apply the default max page size when no limit is provided', () => {
      const mockQuery = { skip: jest.fn(), limit: jest.fn() } as unknown as Query<any, any>;
      const paginationInput = {};
      addPaginationToQuery(mockQuery, paginationInput);
      expect(mockQuery.skip).not.toHaveBeenCalled();
      expect(mockQuery.limit).toHaveBeenCalledWith(MAX_QUERY_PAGE_SIZE);
    });

    it('should ignore skip when it is zero', () => {
      const mockQuery = { skip: jest.fn(), limit: jest.fn() } as unknown as Query<any, any>;
      const paginationInput = { skip: 0, limit: 10 };

      addPaginationToQuery(mockQuery, paginationInput);

      expect(mockQuery.skip).not.toHaveBeenCalled();
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should throw when limit exceeds the maximum page size', () => {
      const mockQuery = { skip: jest.fn(), limit: jest.fn() } as unknown as Query<any, any>;
      const paginationInput = { limit: MAX_QUERY_PAGE_SIZE + 1 };

      expect(() => addPaginationToQuery(mockQuery, paginationInput)).toThrow(
        `Pagination limit must be between 1 and ${MAX_QUERY_PAGE_SIZE}.`,
      );
    });

    it('should throw when limit is not positive', () => {
      const mockQuery = { skip: jest.fn(), limit: jest.fn() } as unknown as Query<any, any>;
      const paginationInput = { limit: 0 };

      expect(() => addPaginationToQuery(mockQuery, paginationInput)).toThrow(
        `Pagination limit must be between 1 and ${MAX_QUERY_PAGE_SIZE}.`,
      );
    });

    it('should throw when skip is negative', () => {
      const mockQuery = { skip: jest.fn(), limit: jest.fn() } as unknown as Query<any, any>;
      const paginationInput = { skip: -5, limit: 10 };

      expect(() => addPaginationToQuery(mockQuery, paginationInput)).toThrow(
        'Pagination skip must be greater than or equal to 0.',
      );
    });
  });

  describe('addFiltersToQuery', () => {
    it('should add "equality" filter to the query', () => {
      const mockQuery = { where: jest.fn().mockReturnThis(), equals: jest.fn().mockReturnThis() } as unknown as Query<
        any,
        any
      >;
      const filters: FilterInput[] = [
        {
          field: 'status',
          value: 'Completed',
          operator: FilterOperatorInput.eq,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.where).toHaveBeenCalledWith('status');
      expect(mockQuery.equals).toHaveBeenCalledWith('Completed');
    });

    it('should add "not equal" than filter to the query', () => {
      const mockQuery = { where: jest.fn().mockReturnThis(), ne: jest.fn().mockReturnThis() } as unknown as Query<
        any,
        any
      >;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.ne,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.where).toHaveBeenCalledWith('capacity');
      expect(mockQuery.ne).toHaveBeenCalledWith(50);
    });

    it('should add "greater than" filter to the query', () => {
      const mockQuery = { gt: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.gt,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.gt).toHaveBeenCalledWith('capacity', 50);
    });

    it('should add "greater than or equal" filter to the query', () => {
      const mockQuery = { gte: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.gte,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.gte).toHaveBeenCalledWith('capacity', 50);
    });

    it('should add "less than" filter to the query', () => {
      const mockQuery = { lt: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.lt,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.lt).toHaveBeenCalledWith('capacity', 50);
    });

    it('should add "less than or equal" filter to the query', () => {
      const mockQuery = { lte: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.lte,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.lte).toHaveBeenCalledWith('capacity', 50);
    });

    it('should add "default (equality)" filter to the query', () => {
      const mockQuery = { where: jest.fn().mockReturnThis(), equals: jest.fn().mockReturnThis() } as unknown as Query<
        any,
        any
      >;
      const filters: FilterInput[] = [
        {
          field: 'status',
          value: 'Completed',
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.where).toHaveBeenCalledWith('status');
      expect(mockQuery.equals).toHaveBeenCalledWith('Completed');
    });
  });

  describe('transformOptionsToQuery', () => {
    const createMockSuccessMongooseQuery = <T>(result: T) => ({
      ...result,
      exec: jest.fn().mockResolvedValue(result),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      regex: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    });
    const buildMockModel = () => {
      const mockQuery = createMockSuccessMongooseQuery({});
      const find = jest.fn().mockReturnValue(mockQuery);
      return { mockModel: { find } as unknown as Model<any>, mockQuery };
    };

    it('should add filters, sort, and pagination to the query', () => {
      const { mockModel } = buildMockModel();
      const options = {
        filters: [
          {
            field: 'status',
            value: 'Completed',
            operator: FilterOperatorInput.eq,
          },
        ],
        sort: [
          {
            field: 'name',
            order: SortOrderInput.asc,
          },
        ],
        pagination: { skip: 10, limit: 20 },
      };

      transformOptionsToQuery(mockModel, options);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should handle missing options gracefully', () => {
      const { mockModel } = buildMockModel();
      const options = {};
      transformOptionsToQuery(mockModel, options);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should apply text search when provided', () => {
      const { mockModel, mockQuery } = buildMockModel();
      const options = {
        search: {
          fields: ['username', 'email'],
          value: 'Ali',
        },
      };

      transformOptionsToQuery(mockModel, options);

      expect(mockQuery.or).toHaveBeenCalledWith([{ username: expect.any(RegExp) }, { email: expect.any(RegExp) }]);
    });

    it('should apply text search via or for a single field', () => {
      const { mockModel, mockQuery } = buildMockModel();
      const options = {
        search: {
          fields: ['username'],
          value: 'Ali',
        },
      };

      transformOptionsToQuery(mockModel, options);

      expect(mockQuery.or).toHaveBeenCalledWith([{ username: expect.any(RegExp) }]);
      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(mockQuery.regex).not.toHaveBeenCalled();
    });

    it('should skip text search when value is blank', () => {
      const { mockModel, mockQuery } = buildMockModel();
      const options = {
        search: {
          fields: ['username'],
          value: '   ',
        },
      };

      transformOptionsToQuery(mockModel, options);

      expect(mockQuery.or).not.toHaveBeenCalled();
      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    it('should throw when text search fields are empty', () => {
      const { mockModel } = buildMockModel();
      const options = {
        search: {
          fields: ['   '],
          value: 'Ali',
        },
      };

      expect(() => transformOptionsToQuery(mockModel, options)).toThrow(
        'Text search requires at least one field to search against.',
      );
    });
  });
});
