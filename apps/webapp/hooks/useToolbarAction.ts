'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';

export function useToolbarAction(action: ReactNode | null) {
  const { setToolbarAction } = useAppContext();

  useEffect(() => {
    setToolbarAction(action);

    return () => {
      setToolbarAction(null);
    };
  }, [action, setToolbarAction]);
}
