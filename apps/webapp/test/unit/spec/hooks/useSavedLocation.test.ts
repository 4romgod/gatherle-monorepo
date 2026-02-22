import { act, renderHook } from '@testing-library/react';
import { useSavedLocation } from '@/hooks/useSavedLocation';

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
  isAuthenticated: jest.fn(async () => false),
}));

const mockUseQuery = jest.fn();
const mockMutate = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn((...args) => mockUseQuery(...args)),
  useMutation: jest.fn(() => [mockMutate, { loading: false, error: null }]),
  gql: jest.fn((strings: TemplateStringsArray) => strings[0]),
}));

describe('useSavedLocation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: null });
  });

  it('stores location in the user-scoped namespace', () => {
    const userId = 'user-123';
    const { result } = renderHook(() => useSavedLocation(userId));

    act(() => {
      result.current.setLocation({ latitude: 1.23, longitude: 4.56, radiusKm: 25, displayLabel: 'Pretoria' });
    });

    const storedKey = `location:${userId}:user-location`;
    const storedRaw = window.localStorage.getItem(storedKey);

    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored.value).toEqual({
      latitude: 1.23,
      longitude: 4.56,
      radiusKm: 25,
      displayLabel: 'Pretoria',
    });
  });

  it('clears storage and resets to empty location', () => {
    const { result } = renderHook(() => useSavedLocation('user-456'));

    act(() => {
      result.current.setLocation({ latitude: 10, longitude: 20, radiusKm: 50 });
    });

    act(() => {
      result.current.clearLocation();
    });

    expect(result.current.location).toEqual({});
  });
});
