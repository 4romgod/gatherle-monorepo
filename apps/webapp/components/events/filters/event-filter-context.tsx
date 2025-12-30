'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { EventStatus } from '@/data/graphql/types/graphql';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

export interface EventFilters {
  categories: string[];
  priceRange: [number, number];
  dateRange: {
    start: Dayjs | null;
    end: Dayjs | null;
  };
  statuses: EventStatus[];
  searchQuery: string;
}

interface EventFilterContextType {
  filters: EventFilters;
  setCategories: (categories: string[]) => void;
  setPriceRange: (range: [number, number]) => void;
  setDateRange: (start: Dayjs | null, end: Dayjs | null) => void;
  setStatuses: (statuses: EventStatus[]) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  removeCategory: (category: string) => void;
  removeStatus: (status: EventStatus) => void;
  filteredEvents: EventPreview[];
  hasActiveFilters: boolean;
}

const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

const initialFilters: EventFilters = {
  categories: [],
  priceRange: [0, 500],
  dateRange: { start: null, end: null },
  statuses: [],
  searchQuery: '',
};

interface EventFilterProviderProps {
  children: ReactNode;
  events: EventPreview[];
}

export const EventFilterProvider: React.FC<EventFilterProviderProps> = ({ children, events }) => {
  const [filters, setFilters] = useState<EventFilters>(initialFilters);

  const setCategories = (categories: string[]) => {
    setFilters(prev => ({ ...prev, categories }));
  };

  const setPriceRange = (range: [number, number]) => {
    setFilters(prev => ({ ...prev, priceRange: range }));
  };

  const setDateRange = (start: Dayjs | null, end: Dayjs | null) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end } }));
  };

  const setStatuses = (statuses: EventStatus[]) => {
    setFilters(prev => ({ ...prev, statuses }));
  };

  const setSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const removeCategory = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category),
    }));
  };

  const removeStatus = (status: EventStatus) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.filter(s => s !== status),
    }));
  };

  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        event =>
          event.title?.toLowerCase().includes(query) ||
          event.summary?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query),
      );
    }

    // Filter by categories
    if (filters.categories.length > 0) {
      result = result.filter(event => {
        if (!event.eventCategoryList || event.eventCategoryList.length === 0) {
          return false;
        }
        return event.eventCategoryList.some(cat => filters.categories.includes(cat.name));
      });
    }

    // Filter by status
    if (filters.statuses.length > 0) {
      result = result.filter(event => {
        if (!event.status) return false;
        return filters.statuses.includes(event.status);
      });
    }

    // TODO filters are still not working
    // Note: Price and date filtering can be added when those fields are available in the GraphQL query
    // For now, we keep the filter controls in the UI but don't filter by them

    return result;
  }, [events, filters]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.categories.length > 0 ||
      filters.statuses.length > 0 ||
      filters.searchQuery !== '' ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null ||
      filters.priceRange[0] !== initialFilters.priceRange[0] ||
      filters.priceRange[1] !== initialFilters.priceRange[1]
    );
  }, [filters]);

  const value: EventFilterContextType = {
    filters,
    setCategories,
    setPriceRange,
    setDateRange,
    setStatuses,
    setSearchQuery,
    resetFilters,
    removeCategory,
    removeStatus,
    filteredEvents,
    hasActiveFilters,
  };

  return <EventFilterContext.Provider value={value}>{children}</EventFilterContext.Provider>;
};

export const useEventFilters = (): EventFilterContextType => {
  const context = useContext(EventFilterContext);
  if (!context) {
    throw new Error('useEventFilters must be used within an EventFilterProvider');
  }
  return context;
};
