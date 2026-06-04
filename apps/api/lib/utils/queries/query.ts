import type {
  FilterInput,
  PaginationInput,
  QueryOptionsInput,
  SortInput,
  TextSearchInput,
} from '@gatherle/commons/server/types';
import { FilterOperatorInput, SelectorOperatorInput } from '@gatherle/commons/server/types';
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
  const textSearchCondition =
    terms.length === 1 ? { [terms[0]]: regex } : { $or: terms.map((targetField) => ({ [targetField]: regex })) };

  // Keep text search as its own AND-scoped clause so it does not merge into
  // selectorOperator-driven $or groups from addFiltersToQuery.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query.and([textSearchCondition] as any);
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

export const addFiltersToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, filters: FilterInput[]) => {
  const buildCondition = ({ field, value, operator }: FilterInput): Record<string, unknown> => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        throw CustomError(`Filter "${field}" must not use an empty array value.`, ErrorTypes.BAD_REQUEST);
      }
      const effectiveOperator = operator ?? FilterOperatorInput.eq;
      if (effectiveOperator !== FilterOperatorInput.eq && effectiveOperator !== FilterOperatorInput.ne) {
        throw CustomError(
          `Filter "${field}" only supports array values with "eq" or "ne" operators.`,
          ErrorTypes.BAD_REQUEST,
        );
      }
      return { [field]: { [effectiveOperator === FilterOperatorInput.ne ? '$nin' : '$in']: value } };
    }
    return { [field]: { [`$${operator ?? FilterOperatorInput.eq}`]: value } };
  };

  const orFilters = filters.filter((f) => f.selectorOperator === SelectorOperatorInput.or);
  const norFilters = filters.filter((f) => f.selectorOperator === SelectorOperatorInput.nor);
  const andFilters = filters.filter(
    (f) => f.selectorOperator !== SelectorOperatorInput.or && f.selectorOperator !== SelectorOperatorInput.nor,
  );

  const andConditions: Record<string, unknown>[] = [];

  if (andFilters.length > 0) {
    andConditions.push(...andFilters.map(buildCondition));
  }
  if (orFilters.length > 0) {
    andConditions.push({ $or: orFilters.map(buildCondition) });
  }
  if (norFilters.length > 0) {
    andConditions.push({ $nor: norFilters.map(buildCondition) });
  }

  if (andConditions.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query.and(andConditions as any);
  }
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
