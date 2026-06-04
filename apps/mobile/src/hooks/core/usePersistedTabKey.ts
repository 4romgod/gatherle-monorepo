import { useEffect, useMemo, useRef, useState } from 'react';
import { readStoredString, writeStoredString } from '@/lib/deviceStorage';

type UsePersistedTabKeyOptions = {
  availableKeys: string[];
  initialKey?: string;
  storageKey?: string | null;
};

export function usePersistedTabKey({ availableKeys, initialKey, storageKey }: UsePersistedTabKeyOptions) {
  const availableKeySignature = availableKeys.join('|');
  const availableKeySet = useMemo(() => new Set(availableKeys), [availableKeySignature]);
  const resolvedInitialKey = initialKey && availableKeySet.has(initialKey) ? initialKey : null;
  const fallbackKey = availableKeys[0] ?? null;
  const requiresStorageRestore = Boolean(storageKey && !resolvedInitialKey);
  const [activeKey, setActiveKey] = useState<string | null>(resolvedInitialKey ?? fallbackKey);
  const [isHydrated, setIsHydrated] = useState(() => !requiresStorageRestore);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(() =>
    requiresStorageRestore ? null : (storageKey ?? null),
  );
  const previousResolvedInitialKeyRef = useRef<string | null>(resolvedInitialKey);
  const previousStorageKeyRef = useRef<string | null>(storageKey ?? null);

  useEffect(() => {
    if (!resolvedInitialKey) {
      previousResolvedInitialKeyRef.current = null;
      return;
    }

    const previousResolvedInitialKey = previousResolvedInitialKeyRef.current;
    previousResolvedInitialKeyRef.current = resolvedInitialKey;

    if (previousResolvedInitialKey === resolvedInitialKey) {
      setHydratedStorageKey(storageKey ?? null);
      setIsHydrated(true);
      return;
    }

    setActiveKey((currentKey) => (currentKey === resolvedInitialKey ? currentKey : resolvedInitialKey));
    setHydratedStorageKey(storageKey ?? null);
    setIsHydrated(true);
  }, [resolvedInitialKey, storageKey]);

  useEffect(() => {
    let isMounted = true;

    if (!storageKey || resolvedInitialKey) {
      setHydratedStorageKey(storageKey ?? null);
      setIsHydrated(true);
      return () => {
        isMounted = false;
      };
    }

    const didStorageKeyChange = previousStorageKeyRef.current !== storageKey;
    previousStorageKeyRef.current = storageKey;
    setHydratedStorageKey(null);
    setIsHydrated(false);

    if (didStorageKeyChange && fallbackKey) {
      setActiveKey((currentKey) => (currentKey === fallbackKey ? currentKey : fallbackKey));
    }

    const restoreStoredTabKey = async () => {
      const storedKey = await readStoredString(storageKey);

      if (!isMounted) {
        return;
      }

      const nextKey = storedKey && availableKeySet.has(storedKey) ? storedKey : fallbackKey;
      if (nextKey) {
        setActiveKey((currentKey) => (currentKey === nextKey ? currentKey : nextKey));
      }
      setHydratedStorageKey(storageKey);
      setIsHydrated(true);
    };

    void restoreStoredTabKey();

    return () => {
      isMounted = false;
    };
  }, [availableKeySet, fallbackKey, resolvedInitialKey, storageKey]);

  useEffect(() => {
    if (!activeKey || availableKeySet.has(activeKey)) {
      return;
    }

    setActiveKey(fallbackKey);
  }, [activeKey, availableKeySet, fallbackKey]);

  useEffect(() => {
    if (
      !storageKey ||
      !isHydrated ||
      hydratedStorageKey !== storageKey ||
      !activeKey ||
      !availableKeySet.has(activeKey)
    ) {
      return;
    }

    void writeStoredString(storageKey, activeKey);
  }, [activeKey, availableKeySet, hydratedStorageKey, isHydrated, storageKey]);

  const resolvedActiveKey = activeKey && availableKeySet.has(activeKey) ? activeKey : fallbackKey;
  const visibleActiveKey =
    requiresStorageRestore && hydratedStorageKey !== storageKey ? fallbackKey : resolvedActiveKey;

  return {
    activeKey: visibleActiveKey,
    isHydrated,
    setActiveKey,
  };
}
