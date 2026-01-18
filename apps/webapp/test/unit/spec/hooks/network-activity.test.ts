/**
 * Network Activity Utilities Tests
 *
 * Note: These tests focus on the pure functions and patterns.
 * The actual fetch interceptor behavior is difficult to test in isolation
 * due to global state and window.fetch modifications.
 */

import { subscribeToNetworkActivity, installNetworkInterceptor, useNetworkActivity } from '@/hooks/useNetworkActivity';

// We need to test these in a limited way since they modify global state
describe('Network Activity Utilities', () => {
  describe('subscribeToNetworkActivity', () => {
    it('should add listener and call it immediately with current count', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToNetworkActivity(listener);

      // Listener should be called immediately with current activeRequests (0)
      expect(listener).toHaveBeenCalledWith(0);

      unsubscribe();
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToNetworkActivity(listener);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should allow multiple subscribers', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = subscribeToNetworkActivity(listener1);
      const unsubscribe2 = subscribeToNetworkActivity(listener2);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('installNetworkInterceptor', () => {
    it('should be a function', () => {
      expect(typeof installNetworkInterceptor).toBe('function');
    });

    // Note: We can't fully test the interceptor without complex mocking
    // because it modifies window.fetch globally and has internal state
  });

  describe('useNetworkActivity hook', () => {
    // This is a React hook, so we test it separately with React Testing Library
    // For now, we just verify it's exported correctly
    it('should be exported as a function', () => {
      expect(typeof useNetworkActivity).toBe('function');
    });
  });
});
