import {InputType, Field, Int, registerEnumType} from 'type-graphql';
import {AnyType} from './customTypes';
import {QUERY_DESCRIPTIONS} from '@/constants/descriptions';

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
    description: QUERY_DESCRIPTIONS.SORT.ORDER,
});

registerEnumType(FilterOperatorInput, {
    name: 'FilterOperatorInput',
    description: QUERY_DESCRIPTIONS.FILTER.OPERATOR,
});

registerEnumType(SelectorOperatorInput, {
    name: 'SelectorOperatorInput',
    description: QUERY_DESCRIPTIONS.FILTER.SELECTOR_OPERATOR,
});

@InputType({description: QUERY_DESCRIPTIONS.PAGINATION.INPUT})
export class PaginationInput {
    @Field((type) => Int, {nullable: true, description: QUERY_DESCRIPTIONS.PAGINATION.LIMIT})
    limit?: number;

    @Field((type) => Int, {nullable: true, description: QUERY_DESCRIPTIONS.PAGINATION.SKIP})
    skip?: number;
}

@InputType({description: QUERY_DESCRIPTIONS.SORT.INPUT})
export class SortInput {
    @Field((type) => String, {description: QUERY_DESCRIPTIONS.SORT.FIELD})
    field: string;

    @Field((type) => SortOrderInput, {defaultValue: SortOrderInput.asc, description: QUERY_DESCRIPTIONS.SORT.ORDER})
    order: SortOrderInput;
}

@InputType({description: QUERY_DESCRIPTIONS.FILTER.INPUT})
export class FilterInput {
    @Field((type) => String, {description: QUERY_DESCRIPTIONS.FILTER.FIELD})
    field: string;

    @Field((type) => AnyType, {description: QUERY_DESCRIPTIONS.FILTER.VALUE})
    value: string | number | boolean;

    @Field(() => FilterOperatorInput, {
        nullable: true,
        defaultValue: FilterOperatorInput.eq,
        description: QUERY_DESCRIPTIONS.FILTER.OPERATOR,
    })
    operator?: FilterOperatorInput;
}

@InputType({description: QUERY_DESCRIPTIONS.QUERY.INPUT})
export class QueryOptionsInput {
    @Field(() => PaginationInput, {nullable: true, description: QUERY_DESCRIPTIONS.QUERY.PAGINATION})
    pagination?: PaginationInput;

    @Field(() => [SortInput], {nullable: true, description: QUERY_DESCRIPTIONS.QUERY.SORT})
    sort?: SortInput[];

    @Field(() => [FilterInput], {nullable: true, description: QUERY_DESCRIPTIONS.QUERY.FILTER})
    filters?: FilterInput[];
}
