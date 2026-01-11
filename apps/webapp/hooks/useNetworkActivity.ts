'use client';

import { useEffect, useState } from 'react';

type NetworkActivityListener = (activeRequests: number) => void;

let activeRequests = 0;
const listeners = new Set<NetworkActivityListener>();
let interceptorInstalled = false;

const notifyListeners = () => {
  listeners.forEach(listener => listener(activeRequests));
};

const updateActiveRequests = (delta: number) => {
  activeRequests = Math.max(0, activeRequests + delta);
  notifyListeners();
};

export const installNetworkInterceptor = () => {
  if (typeof window === 'undefined' || interceptorInstalled) {
    return;
  }

  interceptorInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    updateActiveRequests(1);
    try {
      return await originalFetch(...args);
    } finally {
      updateActiveRequests(-1);
    }
  };
};

export const subscribeToNetworkActivity = (listener: NetworkActivityListener) => {
  listeners.add(listener);
  listener(activeRequests);
  return () => {
    listeners.delete(listener);
  };
};

export const useNetworkActivity = () => {
  const [count, setCount] = useState(activeRequests);

  useEffect(() => {
    installNetworkInterceptor();
    const unsubscribe = subscribeToNetworkActivity(setCount);
    return unsubscribe;
  }, []);

  return count;
};
