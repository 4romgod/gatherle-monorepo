'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
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
    filterOption?: string; // Store the filter option (today, tomorrow, etc.)
  };
  statuses: EventStatus[];
  searchQuery: string;
}

export interface EventFilterContextType {
  filters: EventFilters;
  setCategories: (categories: string[]) => void;
  setPriceRange: (range: [number, number]) => void;
  setDateRange: (start: Dayjs | null, end: Dayjs | null, filterOption?: string) => void;
  setStatuses: (statuses: EventStatus[]) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  removeCategory: (category: string) => void;
  removeStatus: (status: EventStatus) => void;
  hasActiveFilters: boolean;
}

export const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

const initialFilters: EventFilters = {
  categories: [],
  priceRange: [0, 500],
  dateRange: { start: null, end: null },
  statuses: [],
  searchQuery: '',
};

interface EventFilterProviderProps {
  children: ReactNode;
}

export const EventFilterProvider: React.FC<EventFilterProviderProps> = ({ children }) => {
  const [filters, setFilters] = useState<EventFilters>(initialFilters);

  const setCategories = (categories: string[]) => {
    setFilters(prev => ({ ...prev, categories }));
  };

  const setPriceRange = (range: [number, number]) => {
    setFilters(prev => ({ ...prev, priceRange: range }));
  };

  const setDateRange = (start: Dayjs | null, end: Dayjs | null, filterOption?: string) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end, filterOption } }));
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
    hasActiveFilters,
  };

  return <EventFilterContext.Provider value={value}>{children}</EventFilterContext.Provider>;
};
