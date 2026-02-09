import { useCallback } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import type { LocationFilter } from '@/components/events/filters/EventFilterContext';

const DEFAULT_LOCATION: LocationFilter = {};
const LOCATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const useSavedLocation = (userId?: string) => {
  const {
    value: location,
    setValue: setLocationValue,
    clearStorage,
    isHydrated,
  } = usePersistentState<LocationFilter>('user-location', DEFAULT_LOCATION, {
    namespace: 'location',
    userId,
    ttl: LOCATION_TTL_MS,
  });

  const setLocation = useCallback(
    (nextLocation: LocationFilter) => {
      setLocationValue(nextLocation);
    },
    [setLocationValue],
  );

  const clearLocation = useCallback(() => {
    clearStorage();
  }, [clearStorage]);

  return {
    location,
    setLocation,
    clearLocation,
    isHydrated,
  };
};
