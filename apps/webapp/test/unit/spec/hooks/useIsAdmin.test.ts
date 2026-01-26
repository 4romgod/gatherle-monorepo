import { renderHook } from '@testing-library/react';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

describe('useIsAdmin', () => {
  it('returns true when user has admin role', () => {
    mockUseSession.mockReturnValue({
      data: { user: { userRole: 'Admin' } },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it('returns false for non-admin roles', () => {
    mockUseSession.mockReturnValue({
      data: { user: { userRole: 'User' } },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});
