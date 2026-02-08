import { InputType, Field, Int, registerEnumType } from 'type-graphql';

import { QUERY_DESCRIPTIONS } from '../constants';
import { AnyType } from './customTypes';
import type { DateFilterOption } from '../constants';
import { DATE_FILTER_OPTIONS } from '../constants';

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

// Register DATE_FILTER_OPTIONS enum for GraphQL, excluding CUSTOM (UI-only)
// We create a new enum type that only includes the backend-valid options
export enum DateFilterOptionEnum {
  TODAY = DATE_FILTER_OPTIONS.TODAY,
  TOMORROW = DATE_FILTER_OPTIONS.TOMORROW,
  THIS_WEEK = DATE_FILTER_OPTIONS.THIS_WEEK,
  THIS_WEEKEND = DATE_FILTER_OPTIONS.THIS_WEEKEND,
  THIS_MONTH = DATE_FILTER_OPTIONS.THIS_MONTH,
}

registerEnumType(DateFilterOptionEnum, {
  name: 'DateFilterOption',
  description:
    'Predefined date filter options for events. Backend calculates the date range based on the selected option.',
});

@InputType('PaginationInput', { description: QUERY_DESCRIPTIONS.PAGINATION.INPUT })
export class PaginationInput {
  @Field(() => Int, { nullable: true, description: QUERY_DESCRIPTIONS.PAGINATION.LIMIT })
  limit?: number;

  @Field(() => Int, { nullable: true, description: QUERY_DESCRIPTIONS.PAGINATION.SKIP })
  skip?: number;
}

@InputType('SortInput', { description: QUERY_DESCRIPTIONS.SORT.INPUT })
export class SortInput {
  @Field(() => String, { description: QUERY_DESCRIPTIONS.SORT.FIELD })
  field: string;

  @Field(() => SortOrderInput, { defaultValue: SortOrderInput.asc, description: QUERY_DESCRIPTIONS.SORT.ORDER })
  order: SortOrderInput;
}

@InputType('FilterInput', { description: QUERY_DESCRIPTIONS.FILTER.INPUT })
export class FilterInput {
  @Field(() => String, { description: QUERY_DESCRIPTIONS.FILTER.FIELD })
  field: string;

  @Field(() => AnyType, { description: QUERY_DESCRIPTIONS.FILTER.VALUE })
  value: string | number | boolean | Array<string | number | boolean>;

  @Field(() => FilterOperatorInput, {
    nullable: true,
    defaultValue: FilterOperatorInput.eq,
    description: QUERY_DESCRIPTIONS.FILTER.OPERATOR,
  })
  operator?: FilterOperatorInput;
}

@InputType('TextSearchInput', { description: QUERY_DESCRIPTIONS.SEARCH.INPUT })
export class TextSearchInput {
  @Field(() => [String], { description: QUERY_DESCRIPTIONS.SEARCH.FIELDS })
  fields: string[];

  @Field(() => String, { description: QUERY_DESCRIPTIONS.SEARCH.VALUE })
  value: string;

  @Field(() => Boolean, {
    nullable: true,
    description: QUERY_DESCRIPTIONS.SEARCH.CASE_SENSITIVE,
    defaultValue: false,
  })
  caseSensitive?: boolean;
}

@InputType('DateRangeInput', { description: 'Date range filter for events' })
export class DateRangeInput {
  @Field(() => Date, { nullable: true, description: 'Start date of the range' })
  startDate?: Date;

  @Field(() => Date, { nullable: true, description: 'End date of the range' })
  endDate?: Date;
}

@InputType('LocationFilterInput', { description: 'Location-based filtering for events' })
export class LocationFilterInput {
  @Field(() => String, { nullable: true, description: 'Filter by city name' })
  city?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by state/province (e.g., "Gauteng", "California", "Bavaria")',
  })
  state?: string;

  @Field(() => String, { nullable: true, description: 'Filter by country' })
  country?: string;

  @Field(() => Number, { nullable: true, description: 'Latitude for proximity search' })
  latitude?: number;

  @Field(() => Number, { nullable: true, description: 'Longitude for proximity search' })
  longitude?: number;

  @Field(() => Number, { nullable: true, description: 'Radius in kilometers for proximity search (default: 50km)' })
  radiusKm?: number;
}

/**
 * Generic query options for non-event entities (organizations, venues, users, categories, etc.)
 * Contains only pagination, sort, and filters - no event-specific date filtering.
 */
@InputType('QueryOptionsInput', { description: 'Generic query options for pagination, sorting, and filtering' })
export class QueryOptionsInput {
  @Field(() => PaginationInput, { nullable: true, description: QUERY_DESCRIPTIONS.QUERY.PAGINATION })
  pagination?: PaginationInput;

  @Field(() => [SortInput], { nullable: true, description: QUERY_DESCRIPTIONS.QUERY.SORT })
  sort?: SortInput[];

  @Field(() => [FilterInput], { nullable: true, description: QUERY_DESCRIPTIONS.QUERY.FILTER })
  filters?: FilterInput[];

  @Field(() => TextSearchInput, { nullable: true, description: QUERY_DESCRIPTIONS.SEARCH.INPUT })
  search?: TextSearchInput;
}

/**
 * Extended query options specifically for Events.
 * Includes all generic options plus event-specific fields: date filtering, location, and category filtering.
 */
@InputType('EventsQueryOptionsInput', {
  description: 'Query options for events with date, location, and category filtering',
})
export class EventsQueryOptionsInput {
  @Field(() => PaginationInput, { nullable: true, description: QUERY_DESCRIPTIONS.QUERY.PAGINATION })
  pagination?: PaginationInput;

  @Field(() => [SortInput], { nullable: true, description: QUERY_DESCRIPTIONS.QUERY.SORT })
  sort?: SortInput[];

  @Field(() => [FilterInput], { nullable: true, description: QUERY_DESCRIPTIONS.QUERY.FILTER })
  filters?: FilterInput[];

  @Field(() => TextSearchInput, { nullable: true, description: QUERY_DESCRIPTIONS.SEARCH.INPUT })
  search?: TextSearchInput;

  @Field(() => DateRangeInput, {
    nullable: true,
    description:
      'Filter events by date range (evaluates RRULEs). Precedence: customDate > dateFilterOption > dateRange. Use dateFilterOption for predefined ranges or customDate for single dates.',
  })
  dateRange?: DateRangeInput;

  @Field(() => DateFilterOptionEnum, {
    nullable: true,
    description:
      'Predefined date filter option. Backend calculates the date range. Takes precedence over dateRange. For custom dates, use customDate field instead.',
  })
  dateFilterOption?: DateFilterOption;

  @Field(() => Date, {
    nullable: true,
    description:
      'Custom date to filter events. Highest precedence: when provided, this overrides both dateFilterOption and dateRange.',
  })
  customDate?: Date;

  @Field(() => LocationFilterInput, { nullable: true, description: 'Location-based filtering for proximity search' })
  location?: LocationFilterInput;
}
