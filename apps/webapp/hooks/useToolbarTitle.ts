'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';

export function useToolbarTitle(title: ReactNode | null) {
  const { setToolbarTitle } = useAppContext();

  useEffect(() => {
    setToolbarTitle(title);

    return () => {
      setToolbarTitle(null);
    };
  }, [setToolbarTitle, title]);
}
