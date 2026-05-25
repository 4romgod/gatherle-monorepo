import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GetUsersDocument } from '@data/graphql/query/User/query';
import type { MobileDirectoryUser } from '@data/graphql/query/User/types';
import { getApolloAuthContext } from '@/lib/auth';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export function useUserSearch(authToken: string | null) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const [results, setResults] = useState<MobileDirectoryUser[]>([]);

  const [executeSearch, { data, loading }] = useLazyQuery(GetUsersDocument, {
    fetchPolicy: 'network-only',
    ...getApolloAuthContext(authToken),
  });

  useEffect(() => {
    if (!isMountedRef.current) {
      return;
    }

    setResults(data?.readUsers ?? []);
  }, [data]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, []);

  const search = useCallback(
    (query: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      const trimmedQuery = query.trim();
      if (trimmedQuery.length < MIN_CHARS) {
        setResults([]);
        return;
      }

      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;

        void executeSearch({
          variables: {
            options: {
              search: {
                value: trimmedQuery,
                fields: ['username', 'given_name', 'family_name'],
              },
              pagination: { limit: 20 },
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
      debounceTimer.current = null;
    }
    setResults([]);
  }, []);

  return { clear, loading, results, search };
}
