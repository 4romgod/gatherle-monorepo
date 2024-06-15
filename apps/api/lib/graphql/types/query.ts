import {InputType, Field, Int, registerEnumType} from 'type-graphql';
import {AnyType} from './customTypes';

export enum SortOrderInput {
    asc = 'asc',
    desc = 'desc',
}

export enum FilterOperatorInput {
    eq = 'eq',
    ne = 'ne',
    gt = 'gt',
    lt = 'lt',
    gte = 'gte',
    lte = 'lte',
}

export enum SelectorOperatorInput {
    and = 'and',
    nor = 'nor',
    or = 'or',
    search = 'search',
    caseSensitive = 'caseSensitive',
}

registerEnumType(SortOrderInput, {
    name: 'SortOrderInput',
    description: 'The order to sort the results ("asc" or "desc")',
});

registerEnumType(FilterOperatorInput, {
    name: 'FilterOperatorInput',
    description: "The operator to apply ('eq', 'ne', 'gt', 'lt', 'gte', 'lte')",
});

registerEnumType(SelectorOperatorInput, {
    name: 'SelectorOperatorInput',
    description: "The selector operator to apply ('and', 'nor', 'or', 'search', 'caseSensitive')",
});

@InputType({description: 'Pagination options for limiting and skipping results'})
export class PaginationInput {
    @Field(() => Int, {nullable: true, description: 'The number of results to return'})
    limit?: number;

    @Field(() => Int, {nullable: true, description: 'The number of results to skip'})
    skip?: number;
}

@InputType({description: 'Sorting options for ordering results'})
export class SortInput {
    @Field({description: 'The field to sort by'})
    field: string;

    @Field(() => SortOrderInput, {defaultValue: SortOrderInput.asc, description: "The order to sort the results ('asc' or 'desc')"})
    order: SortOrderInput;
}

@InputType({description: 'Filter options for querying specific fields'})
export class FilterInput {
    @Field({description: 'The field to filter by'})
    field: string;

    @Field((type) => AnyType, {description: 'The value to filter the field by'})
    value: string | number | boolean;

    @Field(() => FilterOperatorInput, {
        nullable: true,
        defaultValue: FilterOperatorInput.eq,
        description: "The operator to apply ('eq', 'ne', 'gt', 'lt', 'gte', 'lte')",
    })
    operator?: FilterOperatorInput;
}

@InputType({description: 'Options for querying a model, including pagination, sorting, and filtering'})
export class QueryOptionsInput {
    @Field(() => PaginationInput, {nullable: true, description: 'Pagination options'})
    pagination?: PaginationInput;

    @Field(() => [SortInput], {nullable: true, description: 'Sorting options'})
    sort?: SortInput[];

    @Field(() => [FilterInput], {nullable: true, description: 'Filtering options'})
    filters?: FilterInput[];
}
