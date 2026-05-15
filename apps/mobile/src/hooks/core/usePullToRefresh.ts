import { useCallback, useRef, useState } from 'react';

type RefreshAction = () => Promise<unknown> | unknown;

export function usePullToRefresh(refreshAction: RefreshAction) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;
    setRefreshing(true);

    try {
      await refreshAction();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [refreshAction]);

  return {
    onRefresh,
    refreshing,
  };
}
