import type {FilterInput, PaginationInput, QueryOptionsInput, SortInput} from '@ntlango/commons/types';
import type {Model, Query} from 'mongoose';

export const addSortToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, sortInput: SortInput[]) => {
  const sortOptions: Record<string, 1 | -1> = {};
  sortInput.forEach((sort) => {
    sortOptions[sort.field] = sort.order === 'asc' ? 1 : -1;
  });
  query.sort(sortOptions);
};

export const addPaginationToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, paginationInput: PaginationInput) => {
  if (paginationInput.skip) {
    query.skip(paginationInput.skip);
  }
  if (paginationInput.limit) {
    query.limit(paginationInput.limit);
  }
};

// TODO fix this and make it filter for nested fields, filter event based on gender of organizers
export const addFiltersToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, filters: FilterInput[]) => {
  filters.forEach(({field, value, operator}) => {
    const fieldParts = field.split('.');
    if (fieldParts.length === 1) {
      switch (operator) {
        case 'eq':
          query.where(field).equals(value);
          break;
        case 'ne':
          query.where(field).ne(value);
          break;
        case 'gt':
          query.gt(field, value);
          break;
        case 'lt':
          query.lt(field, value);
          break;
        case 'gte':
          query.gte(field, value);
          break;
        case 'lte':
          query.lte(field, value);
          break;
        default:
          query.where(field).equals(value);
          break;
      }
    }
  });
};

export const transformOptionsToQuery = <T>(model: Model<T>, options: QueryOptionsInput) => {
  const query = model.find();

  const {filters, sort, pagination} = options;

  if (filters) {
    addFiltersToQuery(query, filters);
  }

  if (sort) {
    addSortToQuery(query, sort);
  }

  if (pagination) {
    addPaginationToQuery(query, pagination);
  }

  return query;
};
