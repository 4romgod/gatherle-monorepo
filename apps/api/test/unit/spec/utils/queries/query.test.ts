import mongoose, { type Model, type Query } from 'mongoose';
import {
  MAX_QUERY_PAGE_SIZE,
  addSortToQuery,
  addPaginationToQuery,
  addFiltersToQuery,
  sanitizeQueryLimit,
  transformOptionsToQuery,
} from '@/utils';
import type { FilterInput, SortInput } from '@gatherle/commons/server/types';
import { FilterOperatorInput, SelectorOperatorInput, SortOrderInput } from '@gatherle/commons/server/types';

describe('Query', () => {
  describe('sanitizeQueryLimit', () => {
    it('clamps an explicit limit into the supported range', () => {
      expect(sanitizeQueryLimit(MAX_QUERY_PAGE_SIZE + 10)).toBe(MAX_QUERY_PAGE_SIZE);
      expect(sanitizeQueryLimit(0)).toBe(1);
    });

    it('clamps the fallback default when limit is missing', () => {
      expect(sanitizeQueryLimit(undefined, MAX_QUERY_PAGE_SIZE + 10)).toBe(MAX_QUERY_PAGE_SIZE);
      expect(sanitizeQueryLimit(undefined, 0)).toBe(1);
    });

    it('falls back to 1 when both limit and default are non-finite', () => {
      expect(sanitizeQueryLimit(undefined, Number.NaN)).toBe(1);
    });
  });

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
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'status',
          value: 'Completed',
          operator: FilterOperatorInput.eq,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ status: { $eq: 'Completed' } }]);
    });

    it('should add "not equal" than filter to the query', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.ne,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ capacity: { $ne: 50 } }]);
    });

    it('should add "greater than" filter to the query', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.gt,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ capacity: { $gt: 50 } }]);
    });

    it('should add "greater than or equal" filter to the query', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.gte,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ capacity: { $gte: 50 } }]);
    });

    it('should add "less than" filter to the query', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.lt,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ capacity: { $lt: 50 } }]);
    });

    it('should add "less than or equal" filter to the query', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'capacity',
          value: 50,
          operator: FilterOperatorInput.lte,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ capacity: { $lte: 50 } }]);
    });

    it('should add "default (equality)" filter to the query', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'status',
          value: 'Completed',
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ status: { $eq: 'Completed' } }]);
    });

    it('should support nested dot-notation fields', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        { field: 'organizers.user.gender', value: 'Male', operator: FilterOperatorInput.eq },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ 'organizers.user.gender': { $eq: 'Male' } }]);
    });

    it('should use $in when a filter value is an array with eq operator', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        { field: 'status', value: ['Active', 'Upcoming'], operator: FilterOperatorInput.eq },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ status: { $in: ['Active', 'Upcoming'] } }]);
    });

    it('should use $nin when a filter value is an array with ne operator', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        { field: 'status', value: ['Cancelled', 'Completed'], operator: FilterOperatorInput.ne },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([{ status: { $nin: ['Cancelled', 'Completed'] } }]);
    });

    it('should apply $or when selectorOperator is "or"', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'status',
          value: 'Active',
          operator: FilterOperatorInput.eq,
          selectorOperator: SelectorOperatorInput.or,
        },
        {
          field: 'status',
          value: 'Upcoming',
          operator: FilterOperatorInput.eq,
          selectorOperator: SelectorOperatorInput.or,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([
        {
          $or: [{ status: { $eq: 'Active' } }, { status: { $eq: 'Upcoming' } }],
        },
      ]);
    });

    it('should apply $nor when selectorOperator is "nor"', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        {
          field: 'status',
          value: 'Cancelled',
          operator: FilterOperatorInput.eq,
          selectorOperator: SelectorOperatorInput.nor,
        },
        {
          field: 'status',
          value: 'Completed',
          operator: FilterOperatorInput.eq,
          selectorOperator: SelectorOperatorInput.nor,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([
        {
          $nor: [{ status: { $eq: 'Cancelled' } }, { status: { $eq: 'Completed' } }],
        },
      ]);
    });

    it('should combine $and, $or, and $nor groups from mixed selectorOperators', () => {
      const mockQuery = { and: jest.fn().mockReturnThis() } as unknown as Query<any, any>;
      const filters: FilterInput[] = [
        { field: 'type', value: 'concert', operator: FilterOperatorInput.eq },
        {
          field: 'status',
          value: 'Active',
          operator: FilterOperatorInput.eq,
          selectorOperator: SelectorOperatorInput.or,
        },
        {
          field: 'status',
          value: 'Upcoming',
          operator: FilterOperatorInput.eq,
          selectorOperator: SelectorOperatorInput.or,
        },
        {
          field: 'status',
          value: 'Cancelled',
          operator: FilterOperatorInput.eq,
          selectorOperator: SelectorOperatorInput.nor,
        },
      ];
      addFiltersToQuery(mockQuery, filters);
      expect(mockQuery.and).toHaveBeenCalledWith([
        { type: { $eq: 'concert' } },
        { $or: [{ status: { $eq: 'Active' } }, { status: { $eq: 'Upcoming' } }] },
        { $nor: [{ status: { $eq: 'Cancelled' } }] },
      ]);
    });

    it('should throw BAD_REQUEST when an array value is empty', () => {
      const mockQuery = {} as unknown as Query<any, any>;
      const filters: FilterInput[] = [{ field: 'status', value: [], operator: FilterOperatorInput.eq }];
      expect(() => addFiltersToQuery(mockQuery, filters)).toThrow('Filter "status" must not use an empty array value.');
    });

    it('should throw BAD_REQUEST when an array value is used with a non-eq/ne operator', () => {
      const mockQuery = {} as unknown as Query<any, any>;
      const filters: FilterInput[] = [{ field: 'capacity', value: [10, 20], operator: FilterOperatorInput.gt }];
      expect(() => addFiltersToQuery(mockQuery, filters)).toThrow(
        'Filter "capacity" only supports array values with "eq" or "ne" operators.',
      );
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
      and: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      nor: jest.fn().mockReturnThis(),
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

      expect(mockQuery.and).toHaveBeenCalledWith([
        { $or: [{ username: expect.any(RegExp) }, { email: expect.any(RegExp) }] },
      ]);
    });

    it('should apply text search directly for a single field', () => {
      const { mockModel, mockQuery } = buildMockModel();
      const options = {
        search: {
          fields: ['username'],
          value: 'Ali',
        },
      };

      transformOptionsToQuery(mockModel, options);

      expect(mockQuery.and).toHaveBeenCalledWith([{ username: expect.any(RegExp) }]);
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

      expect(mockQuery.and).not.toHaveBeenCalled();
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

    it('keeps selectorOperator or filters AND-scoped relative to text search', () => {
      const modelName = 'QueryTransformOptionsToQueryTestModel';
      const model =
        mongoose.models[modelName] ||
        mongoose.model(
          modelName,
          new mongoose.Schema({
            status: String,
            title: String,
            description: String,
          }),
        );

      const query = transformOptionsToQuery(model, {
        filters: [
          {
            field: 'status',
            value: 'Active',
            operator: FilterOperatorInput.eq,
            selectorOperator: SelectorOperatorInput.or,
          },
          {
            field: 'status',
            value: 'Upcoming',
            operator: FilterOperatorInput.eq,
            selectorOperator: SelectorOperatorInput.or,
          },
        ],
        search: {
          fields: ['title', 'description'],
          value: 'Ali',
        },
      });

      expect(query.getQuery()).toEqual({
        $and: [
          {
            $or: [{ status: { $eq: 'Active' } }, { status: { $eq: 'Upcoming' } }],
          },
          {
            $or: [{ title: /Ali/i }, { description: /Ali/i }],
          },
        ],
      });
    });
  });
});
