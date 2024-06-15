import {FilterInput, PaginationInput, QueryOptionsInput, SortInput} from '@/graphql/types';
import {Model, Query} from 'mongoose';

const addSortToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, sortInput: SortInput[]) => {
    const sortOptions: any = {};
    sortInput.forEach((sort) => {
        sortOptions[sort.field] = sort.order === 'asc' ? 1 : -1;
    });
    query = query.sort(sortOptions);
};

const addPaginationToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, paginationInput: PaginationInput) => {
    if (paginationInput.skip) {
        query = query.skip(paginationInput.skip);
    }
    if (paginationInput.limit) {
        query = query.limit(paginationInput.limit);
    }
};

// TODO fix this and make it filter for nested fields, filter event based on gender of organizerList
const addFiltersToQuery = <ResultType, DocType>(query: Query<ResultType, DocType>, filters: FilterInput[]) => {
    filters.forEach(({field, value, operator}) => {
        const fieldParts = field.split('.');
        if (fieldParts.length === 1) {
            switch (operator || 'eq') {
                case 'eq':
                    query = query.where(field).equals(value);
                    break;
                case 'ne':
                    query = query.where(field).ne(value);
                    break;
                case 'gt':
                    query = query.gt(field, value);
                    break;
                case 'lt':
                    query = query.lt(field, value);
                    break;
                case 'gte':
                    query = query.gte(field, value);
                    break;
                case 'lte':
                    query = query.lte(field, value);
                    break;
                default:
                    query = query.where(field).equals(value);
                    break;
            }
        }
    });
};

export const transformOptionsToQuery = <T>(model: Model<T>, options: QueryOptionsInput) => {
    let query = model.find();

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
