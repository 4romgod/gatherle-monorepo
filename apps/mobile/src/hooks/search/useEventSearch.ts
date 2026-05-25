import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SearchEventsDocument } from '@data/graphql/query/Discovery/query';
import type { SearchEventsQuery } from '@data/graphql/types/graphql';
import { SortOrderInput } from '@data/graphql/types/graphql';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

const SEARCH_FIELDS = [
  'title',
  'summary',
  'description',
  'location.address.city',
  'location.address.state',
  'eventCategories.name',
];

export type MobileSearchResult = SearchEventsQuery['readEvents'][number];

export function useEventSearch() {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<MobileSearchResult[]>([]);

  const [executeSearch, { data, loading }] = useLazyQuery(SearchEventsDocument, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    setResults(data?.readEvents ?? []);
  }, [data]);

  const search = useCallback(
    (query: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (query.trim().length < MIN_CHARS) {
        setResults([]);
        return;
      }

      debounceTimer.current = setTimeout(() => {
        void executeSearch({
          variables: {
            options: {
              search: {
                value: query.trim(),
                fields: SEARCH_FIELDS,
              },
              sort: [{ field: 'title', order: SortOrderInput.Asc }],
              pagination: { limit: 15 },
            },
          },
        });
      }, DEBOUNCE_MS);
    },
    [executeSearch],
  );

  const clear = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setResults([]);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { clear, loading, results, search };
}
