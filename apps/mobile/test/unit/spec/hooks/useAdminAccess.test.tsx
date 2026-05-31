import { renderHook } from '@testing-library/react-native';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { UserRole } from '@data/graphql/types/graphql';

const mockUseQuery = jest.fn();
const mockUseAppShell = jest.fn();
const mockGetApolloAuthContext = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@data/graphql/query/User/query', () => ({
  GetUserByIdDocument: 'GetUserByIdDocument',
}));

jest.mock('@/app/providers/AppShellProvider', () => ({
  useAppShell: () => mockUseAppShell(),
}));

jest.mock('@/lib/auth', () => ({
  getApolloAuthContext: (...args: unknown[]) => mockGetApolloAuthContext(...args),
}));

describe('useAdminAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApolloAuthContext.mockImplementation((token: string | null) => ({
      context: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    }));
  });

  it('skips the user lookup until the app shell has a usable auth session', () => {
    mockUseAppShell.mockReturnValue({
      authToken: null,
      isAuthenticated: false,
      userId: null,
    });
    const refetch = jest.fn();
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      refetch,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(mockUseQuery).toHaveBeenCalledWith('GetUserByIdDocument', {
      context: { headers: {} },
      fetchPolicy: 'cache-and-network',
      skip: true,
      variables: undefined,
    });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.authToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(result.current.refetch).toBe(refetch);
  });

  it('resolves admin access from the authenticated user record', () => {
    mockUseAppShell.mockReturnValue({
      authToken: 'admin-token',
      isAuthenticated: true,
      userId: 'user-1',
    });
    const refetch = jest.fn();
    mockUseQuery.mockReturnValue({
      data: {
        readUserById: {
          userId: 'user-1',
          userRole: UserRole.Admin,
        },
      },
      loading: true,
      refetch,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(mockUseQuery).toHaveBeenCalledWith('GetUserByIdDocument', {
      context: { headers: { Authorization: 'Bearer admin-token' } },
      fetchPolicy: 'cache-and-network',
      skip: false,
      variables: { userId: 'user-1' },
    });
    expect(result.current.adminUser).toEqual({
      userId: 'user-1',
      userRole: UserRole.Admin,
    });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.loading).toBe(true);
    expect(result.current.refetch).toBe(refetch);
  });

  it('keeps isAdmin false for authenticated non-admin users', () => {
    mockUseAppShell.mockReturnValue({
      authToken: 'host-token',
      isAuthenticated: true,
      userId: 'user-2',
    });
    mockUseQuery.mockReturnValue({
      data: {
        readUserById: {
          userId: 'user-2',
          userRole: UserRole.Host,
        },
      },
      loading: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.adminUser).toEqual({
      userId: 'user-2',
      userRole: UserRole.Host,
    });
  });
});
