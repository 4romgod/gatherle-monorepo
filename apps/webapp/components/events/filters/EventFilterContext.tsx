'use client';

import React, { createContext, useMemo, ReactNode } from 'react';
import { EventStatus } from '@/data/graphql/types/graphql';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { usePersistentState } from '@/hooks/usePersistentState';

dayjs.extend(isBetween);

export interface LocationFilter {
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  displayLabel?: string;
}

export interface EventFilters {
  categories: string[];
  dateRange: {
    start: Dayjs | null;
    end: Dayjs | null;
    filterOption?: string; // Store the filter option (today, tomorrow, etc.)
  };
  statuses: EventStatus[];
  searchQuery: string;
  location: LocationFilter;
}

export interface EventFilterContextType {
  filters: EventFilters;
  setCategories: (categories: string[]) => void;
  setDateRange: (start: Dayjs | null, end: Dayjs | null, filterOption?: string) => void;
  setStatuses: (statuses: EventStatus[]) => void;
  setSearchQuery: (query: string) => void;
  setLocation: (location: LocationFilter) => void;
  clearLocation: () => void;
  resetFilters: () => void;
  removeCategory: (category: string) => void;
  removeStatus: (status: EventStatus) => void;
  hasActiveFilters: boolean;
  isHydrated: boolean;
}

export const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

export const initialFilters: EventFilters = {
  categories: [],
  dateRange: { start: null, end: null },
  statuses: [],
  searchQuery: '',
  location: {},
};

interface EventFilterProviderProps {
  children: ReactNode;
  userId?: string;
  token?: string;
}

// Serializable version of EventFilters for localStorage
interface SerializedEventFilters {
  categories: string[];
  dateRange: {
    start: string | null; // ISO string
    end: string | null; // ISO string
    filterOption?: string;
  };
  statuses: EventStatus[];
  searchQuery: string;
  location: LocationFilter;
}

// Helper to serialize EventFilters (Dayjs → ISO strings)
const serializeFilters = (filters: EventFilters): SerializedEventFilters => ({
  categories: filters.categories,
  dateRange: {
    start: filters.dateRange.start ? filters.dateRange.start.toISOString() : null,
    end: filters.dateRange.end ? filters.dateRange.end.toISOString() : null,
    filterOption: filters.dateRange.filterOption,
  },
  statuses: filters.statuses,
  searchQuery: filters.searchQuery,
  location: filters.location,
});

// Helper to deserialize EventFilters (ISO strings → Dayjs)
const deserializeFilters = (serialized: SerializedEventFilters): EventFilters => ({
  categories: serialized.categories ?? [],
  dateRange: {
    start: serialized.dateRange?.start ? dayjs(serialized.dateRange.start) : null,
    end: serialized.dateRange?.end ? dayjs(serialized.dateRange.end) : null,
    filterOption: serialized.dateRange?.filterOption,
  },
  statuses: serialized.statuses || [],
  searchQuery: serialized.searchQuery || '',
  location: serialized.location ?? {},
});

export const EventFilterProvider: React.FC<EventFilterProviderProps> = ({ children, userId, token }) => {
  const {
    value: filters,
    setValue: setFilters,
    clearStorage,
    isHydrated,
  } = usePersistentState<EventFilters>('events-filter-state', initialFilters, {
    namespace: 'filters',
    userId,
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    serialize: serializeFilters,
    deserialize: deserializeFilters,
    syncToBackend: false,
    token,
  });

  const setCategories = (categories: string[]) => {
    setFilters((prev) => ({ ...prev, categories }));
  };

  const setDateRange = (start: Dayjs | null, end: Dayjs | null, filterOption?: string) => {
    setFilters((prev) => ({ ...prev, dateRange: { start, end, filterOption } }));
  };

  const setStatuses = (statuses: EventStatus[]) => {
    setFilters((prev) => ({ ...prev, statuses }));
  };

  const setSearchQuery = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  const setLocation = (location: LocationFilter) => {
    setFilters((prev) => ({ ...prev, location }));
  };

  const clearLocation = () => {
    setFilters((prev) => ({ ...prev, location: {} }));
  };

  const resetFilters = () => {
    clearStorage(); // This already resets state to initialFilters internally
  };

  const removeCategory = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== category),
    }));
  };

  const removeStatus = (status: EventStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s !== status),
    }));
  };

  const hasActiveFilters = useMemo(() => {
    const hasLocation = !!(
      filters.location?.city ||
      filters.location?.state ||
      filters.location?.country ||
      filters.location?.latitude
    );
    return (
      filters.categories.length > 0 ||
      filters.statuses.length > 0 ||
      filters.searchQuery !== '' ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null ||
      hasLocation
    );
  }, [filters]);

  const value: EventFilterContextType = {
    filters,
    setCategories,
    setDateRange,
    setStatuses,
    setSearchQuery,
    setLocation,
    clearLocation,
    resetFilters,
    removeCategory,
    removeStatus,
    hasActiveFilters,
    isHydrated,
  };

  return <EventFilterContext.Provider value={value}>{children}</EventFilterContext.Provider>;
};
