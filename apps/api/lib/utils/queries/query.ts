import type {
  FilterInput,
  PaginationInput,
  QueryOptionsInput,
  SortInput,
  TextSearchInput,
} from '@gatherle/commons/types';
import type { Model, Query } from 'mongoose';
import { CustomError, ErrorTypes } from '../exceptions';
import { buildTextSearchRegex } from './text-search';
import { validatePaginationInput } from './validation';

const addTextSearchToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, textSearch: TextSearchInput) => {
  const trimmed = textSearch.value?.trim();
  if (!trimmed) {
    return;
  }

  const terms = textSearch.fields.map((entry) => entry.trim()).filter((entry) => entry.length > 0);

  if (terms.length === 0) {
    throw CustomError('Text search requires at least one field to search against.', ErrorTypes.BAD_REQUEST);
  }

  const regex = buildTextSearchRegex(trimmed, textSearch.caseSensitive);

  query.or(terms.map((targetField) => ({ [targetField]: regex })));
};

export const addSortToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, sortInput: SortInput[]) => {
  const sortOptions: Record<string, 1 | -1> = {};
  sortInput.forEach((sort) => {
    sortOptions[sort.field] = sort.order === 'asc' ? 1 : -1;
  });
  query.sort(sortOptions);
};

export const addPaginationToQuery = <ResultType, DocType>(
  query: Query<ResultType, DocType>,
  paginationInput: PaginationInput,
) => {
  const validatedPagination = validatePaginationInput(paginationInput);

  if (typeof validatedPagination.skip === 'number' && validatedPagination.skip > 0) {
    query.skip(validatedPagination.skip);
  }

  if (typeof validatedPagination.limit === 'number') {
    query.limit(validatedPagination.limit);
  }
};

// TODO fix this and make it filter for nested fields, filter event based on gender of organizers
export const addFiltersToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, filters: FilterInput[]) => {
  filters.forEach(({ field, value, operator }) => {
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

  const { filters, sort, pagination } = options;

  if (filters) {
    addFiltersToQuery(query, filters);
  }

  if (options.search) {
    addTextSearchToQuery(query, options.search);
  }

  if (sort) {
    addSortToQuery(query, sort);
  }

  if (pagination) {
    addPaginationToQuery(query, pagination);
  }

  return query;
};
