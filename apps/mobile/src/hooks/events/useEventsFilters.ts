import { useState } from 'react';
import { DateFilterOption, EventStatus } from '@data/graphql/types/graphql';

export type EventsLocationFilter = {
  city: string;
  state: string;
  country: string;
};

export type EventsFilterState = {
  categories: string[];
  statuses: EventStatus[];
  dateOption: DateFilterOption | null;
  location: EventsLocationFilter;
};

export const DEFAULT_FILTER_STATE: EventsFilterState = {
  categories: [],
  statuses: [],
  dateOption: null,
  location: { city: '', state: '', country: '' },
};

export function countActiveFilters(filters: EventsFilterState): number {
  let count = 0;
  if (filters.categories.length > 0) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.dateOption) count++;
  if (filters.location.city || filters.location.state || filters.location.country) count++;
  return count;
}

export function useEventsFilters() {
  // Applied: what the query actually uses
  const [appliedFilters, setAppliedFilters] = useState<EventsFilterState>(DEFAULT_FILTER_STATE);
  // Draft: what the sheet is editing before "Show results"
  const [draftFilters, setDraftFilters] = useState<EventsFilterState>(DEFAULT_FILTER_STATE);
  const [sheetVisible, setSheetVisible] = useState(false);

  const openSheet = () => {
    setDraftFilters(appliedFilters);
    setSheetVisible(true);
  };

  const closeSheet = () => setSheetVisible(false);

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setSheetVisible(false);
  };

  const clearAllFilters = () => {
    setDraftFilters(DEFAULT_FILTER_STATE);
    setAppliedFilters(DEFAULT_FILTER_STATE);
    setSheetVisible(false);
  };

  const toggleDraftCategory = (categoryName: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryName)
        ? prev.categories.filter((c) => c !== categoryName)
        : [...prev.categories, categoryName],
    }));
  };

  const toggleDraftStatus = (status: EventStatus) => {
    setDraftFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status) ? prev.statuses.filter((s) => s !== status) : [...prev.statuses, status],
    }));
  };

  const setDraftDateOption = (option: DateFilterOption | null) => {
    setDraftFilters((prev) => ({ ...prev, dateOption: option }));
  };

  const setDraftLocation = (location: EventsLocationFilter) => {
    setDraftFilters((prev) => ({ ...prev, location }));
  };

  const clearDraftLocation = () => {
    setDraftFilters((prev) => ({ ...prev, location: DEFAULT_FILTER_STATE.location }));
  };

  // Direct applied-state removals — bypass draft for quick chip X taps
  const removeAppliedDateOption = () => {
    setAppliedFilters((prev) => ({ ...prev, dateOption: null }));
  };

  const removeAppliedCategory = (categoryName: string) => {
    setAppliedFilters((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== categoryName),
    }));
  };

  const removeAppliedStatus = (status: EventStatus) => {
    setAppliedFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s !== status),
    }));
  };

  const removeAppliedLocation = () => {
    setAppliedFilters((prev) => ({ ...prev, location: DEFAULT_FILTER_STATE.location }));
  };

  return {
    appliedFilters,
    draftFilters,
    sheetVisible,
    openSheet,
    closeSheet,
    applyFilters,
    clearAllFilters,
    toggleDraftCategory,
    toggleDraftStatus,
    setDraftDateOption,
    setDraftLocation,
    clearDraftLocation,
    removeAppliedDateOption,
    removeAppliedCategory,
    removeAppliedStatus,
    removeAppliedLocation,
  };
}
