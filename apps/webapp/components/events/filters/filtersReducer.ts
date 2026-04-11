import type { EventStatus } from '@/data/graphql/types/graphql';
import type { Dayjs } from 'dayjs';
import type { EventFilters, LocationFilter } from './EventFilterContext';

export type FilterAction =
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'REMOVE_CATEGORY'; payload: string }
  | { type: 'SET_DATE_RANGE'; payload: { start: Dayjs | null; end: Dayjs | null; filterOption?: string } }
  | { type: 'SET_STATUSES'; payload: EventStatus[] }
  | { type: 'REMOVE_STATUS'; payload: EventStatus }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_LOCATION'; payload: LocationFilter }
  | { type: 'CLEAR_LOCATION' };

export const filtersReducer = (state: EventFilters, action: FilterAction): EventFilters => {
  switch (action.type) {
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'REMOVE_CATEGORY':
      return { ...state, categories: state.categories.filter((c) => c !== action.payload) };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'SET_STATUSES':
      return { ...state, statuses: action.payload };
    case 'REMOVE_STATUS':
      return { ...state, statuses: state.statuses.filter((s) => s !== action.payload) };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'CLEAR_LOCATION':
      return { ...state, location: {} };
  }
};
