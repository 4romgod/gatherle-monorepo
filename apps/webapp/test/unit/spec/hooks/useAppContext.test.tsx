import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { CustomAppContextProvider } from '@/components/context/AppContext';
import { useAppContext } from '@/hooks/useAppContext';

describe('useAppContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CustomAppContextProvider, null, children);

  it('exposes the provider values and setters', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    expect(result.current.themeMode).toBe('light');
    expect(result.current.toastProps.open).toBe(false);
    expect(typeof result.current.setToastProps).toBe('function');
    expect(typeof result.current.setThemeMode).toBe('function');
  });

  it('allows updating the theme mode', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(result.current.themeMode).toBe('dark');
  });
});
