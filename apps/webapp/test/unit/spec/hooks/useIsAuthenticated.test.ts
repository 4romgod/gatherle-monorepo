import { renderHook } from '@testing-library/react';
import { useIsAuthenticated } from '@/hooks/useIsAuthenticated';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

describe('useIsAuthenticated', () => {
  it('returns true when session is authenticated and has userId', () => {
    mockUseSession.mockReturnValue({
      data: { user: { userId: 'user-1' } },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(true);
  });

  it('returns false when session is unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(false);
  });

  it('returns false when user lacks userId', () => {
    mockUseSession.mockReturnValue({
      data: { user: {} },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(false);
  });
});
