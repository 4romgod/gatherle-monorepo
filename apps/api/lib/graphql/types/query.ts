import {InputType, Field, Int} from 'type-graphql';
import {AnyType} from './customTypes';

@InputType({description: 'Pagination options for limiting and skipping results'})
export class PaginationInput {
    @Field(() => Int, {nullable: true, description: 'The number of results to return'})
    limit?: number;

    @Field(() => Int, {nullable: true, description: 'The number of results to skip'})
    skip?: number;
}

export type SortOrderInput = 'asc' | 'desc';

@InputType({description: 'Sorting options for ordering results'})
export class SortInput {
    @Field({description: 'The field to sort by'})
    field: string;

    @Field({description: "The order to sort the results ('asc' or 'desc')"})
    order: SortOrderInput;
}

export type FilterOperatorInput = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte';

@InputType({description: 'Filter options for querying specific fields'})
export class FilterInput {
    @Field({description: 'The field to filter by'})
    field: string;

    @Field((type) => AnyType, {description: 'The value to filter the field by'})
    value: string | number | boolean;

    @Field(() => String, {nullable: true, description: "The operator to apply ('eq', 'ne', 'gt', 'lt', 'gte', 'lte')"})
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
