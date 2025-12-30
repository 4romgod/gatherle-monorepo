import type {Model, Query} from 'mongoose';
import {addSortToQuery, addPaginationToQuery, addFiltersToQuery, transformOptionsToQuery} from '@/utils';
import type {FilterInput, SortInput} from '@ntlango/commons/types';
import {FilterOperatorInput, SortOrderInput} from '@ntlango/commons/types';

describe('Query', () => {
  describe('addSortToQuery', () => {
    it('should add sorting to the query', () => {
      const mockQuery = {sort: jest.fn()} as unknown as Query<any, any>;
      const sortInput: SortInput[] = [
        {field: 'name', order: SortOrderInput.asc},
        {field: 'age', order: SortOrderInput.desc},
      ];
      addSortToQuery(mockQuery, sortInput);
      expect(mockQuery.sort).toHaveBeenCalledWith({name: 1, age: -1});
    });
  });

  describe('addPaginationToQuery', () => {
    it('should add skip and limit to the query', () => {
      const mockQuery = {skip: jest.fn(), limit: jest.fn()} as unknown as Query<any, any>;
      const paginationInput = {skip: 10, limit: 20};
      addPaginationToQuery(mockQuery, paginationInput);
      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should handle missing skip and limit values', () => {
      const mockQuery = {skip: jest.fn(), limit: jest.fn()} as unknown as Query<any, any>;
      const paginationInput = {};
      addPaginationToQuery(mockQuery, paginationInput);
      expect(mockQuery.skip).not.toHaveBeenCalled();
      expect(mockQuery.limit).not.toHaveBeenCalled();
    });
  });

  describe('addFiltersToQuery', () => {
    it('should add "equality" filter to the query', () => {
      const mockQuery = {where: jest.fn().mockReturnThis(), equals: jest.fn().mockReturnThis()} as unknown as Query<any, any>;
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
      const mockQuery = {where: jest.fn().mockReturnThis(), ne: jest.fn().mockReturnThis()} as unknown as Query<any, any>;
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
      const mockQuery = {gt: jest.fn().mockReturnThis()} as unknown as Query<any, any>;
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
      const mockQuery = {gte: jest.fn().mockReturnThis()} as unknown as Query<any, any>;
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
      const mockQuery = {lt: jest.fn().mockReturnThis()} as unknown as Query<any, any>;
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
      const mockQuery = {lte: jest.fn().mockReturnThis()} as unknown as Query<any, any>;
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
      const mockQuery = {where: jest.fn().mockReturnThis(), equals: jest.fn().mockReturnThis()} as unknown as Query<any, any>;
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
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    });
    const find = jest.fn().mockReturnValue(createMockSuccessMongooseQuery({}));
    const mockModel = {find} as unknown as Model<any>;

    it('should add filters, sort, and pagination to the query', () => {
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
        pagination: {skip: 10, limit: 20},
      };

      transformOptionsToQuery(mockModel, options);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it('should handle missing options gracefully', () => {
      const options = {};
      transformOptionsToQuery(mockModel, options);
      expect(mockModel.find).toHaveBeenCalled();
    });
  });
});
