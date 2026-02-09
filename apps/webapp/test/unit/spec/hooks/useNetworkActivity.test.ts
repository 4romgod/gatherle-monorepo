import { act, renderHook } from '@testing-library/react';
import { useNetworkActivity, installNetworkInterceptor } from '@/hooks/useNetworkActivity';

describe('useNetworkActivity utilities', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  const setupModule = () => {
    jest.resetModules();
    let module: typeof import('@/hooks/useNetworkActivity');
    jest.isolateModules(() => {
      module = require('@/hooks/useNetworkActivity');
    });
    return module!;
  };

  it('does nothing when window is undefined', () => {
    const originalWindow = global.window;
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });
    try {
      const { installNetworkInterceptor } = setupModule();

      expect(() => installNetworkInterceptor()).not.toThrow();
    } finally {
      Object.defineProperty(global, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('tracks fetch activity and notifies subscribers', async () => {
    const module = setupModule();
    const { installNetworkInterceptor, subscribeToNetworkActivity } = module;

    const counts: number[] = [];
    const unsubscribe = subscribeToNetworkActivity((count) => counts.push(count));

    window.fetch = jest.fn(async () => ({ ok: true })) as unknown as typeof window.fetch;

    installNetworkInterceptor();

    await window.fetch('/events');

    expect(counts).toEqual([0, 1, 0]);

    unsubscribe();

    await window.fetch('/events');
    expect(counts).toEqual([0, 1, 0]);
  });

  it('updates hook state when network activity changes', async () => {
    window.fetch = jest.fn(async () => ({ ok: true })) as unknown as typeof window.fetch;

    const { result } = renderHook(() => useNetworkActivity());

    installNetworkInterceptor();

    await act(async () => {
      await window.fetch('/events');
    });

    expect(result.current).toBe(0);
  });
});
