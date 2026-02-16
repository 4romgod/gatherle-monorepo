import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { CustomAppContextProvider } from '@/components/context/AppContext';
import { useAppContext } from '@/hooks/useAppContext';
import { STORAGE_KEYS, STORAGE_NAMESPACES } from '@/hooks/usePersistentState/constants';

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
}));

const mockMutate = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
  })),
  useMutation: jest.fn(() => [
    mockMutate,
    {
      loading: false,
      error: null,
    },
  ]),
  gql: jest.fn((strings: TemplateStringsArray) => strings[0]),
}));

const THEME_STORAGE_KEY = `${STORAGE_NAMESPACES.PREFERENCES}:${STORAGE_KEYS.THEME_MODE}`;

describe('useAppContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CustomAppContextProvider, null, children);

  beforeEach(() => {
    window.localStorage.clear();
  });

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

  it('hydrates theme mode from localStorage when available', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ value: 'dark' }));

    const { result } = renderHook(() => useAppContext(), { wrapper });

    expect(result.current.themeMode).toBe('dark');
  });

  it('persists theme mode updates to localStorage', async () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.setThemeMode('dark');
    });

    const rawValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    expect(rawValue).not.toBeNull();
    expect(JSON.parse(rawValue as string).value).toBe('dark');
  });
});
