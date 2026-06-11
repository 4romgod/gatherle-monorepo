import { renderHook } from '@testing-library/react-native';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { OrganizationRole, UserRole } from '@data/graphql/types/graphql';
import { useEventManagementAccess } from '@/hooks/events/useEventManagementAccess';

const mockUseQuery = jest.fn();
const mockUseAdminAccess = jest.fn();
const mockGetApolloAuthContext = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@/hooks/admin/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

jest.mock('@/lib/auth', () => ({
  getApolloAuthContext: (...args: unknown[]) => mockGetApolloAuthContext(...args),
}));

const emptyQueryResult = {
  data: undefined,
  loading: false,
};

const personalEvent = {
  orgId: null,
  organizers: [{ user: { userId: 'user-1' } }],
} as any;

const orgEvent = {
  orgId: 'org-1',
  organization: { orgId: 'org-1' },
  organizers: [{ user: { userId: 'host-2' } }],
} as any;

describe('useEventManagementAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(emptyQueryResult);
    mockGetApolloAuthContext.mockImplementation((token: string | null) => ({
      context: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    }));
    mockUseAdminAccess.mockReturnValue({
      adminUser: { userRole: UserRole.User },
      authToken: 'user-token',
      isAdmin: false,
      isAuthenticated: true,
      loading: false,
      userId: 'user-1',
    });
  });

  it('authorizes personal events for listed organizers without loading org memberships', () => {
    const { result } = renderHook(() => useEventManagementAccess(personalEvent));

    expect(mockUseQuery).toHaveBeenCalledWith(GetMyOrganizationsDocument, {
      context: { headers: { Authorization: 'Bearer user-token' } },
      fetchPolicy: 'cache-and-network',
      skip: true,
    });
    expect(result.current.canManageEvent).toBe(true);
  });

  it('authorizes org-linked events for allowed org roles', () => {
    mockUseQuery.mockReturnValue({
      data: {
        readMyOrganizations: [{ role: OrganizationRole.Host, organization: { orgId: 'org-1', name: 'Org 1' } }],
      },
      loading: false,
    });

    const { result } = renderHook(() => useEventManagementAccess(orgEvent));

    expect(result.current.canManageEvent).toBe(true);
    expect(mockUseQuery).toHaveBeenCalledWith(
      GetMyOrganizationsDocument,
      expect.objectContaining({
        skip: false,
      }),
    );
  });

  it('denies org-linked events when the viewer lacks an allowed org role', () => {
    mockUseQuery.mockReturnValue({
      data: {
        readMyOrganizations: [{ role: OrganizationRole.Member, organization: { orgId: 'org-1', name: 'Org 1' } }],
      },
      loading: false,
    });

    const { result } = renderHook(() => useEventManagementAccess(orgEvent));

    expect(result.current.canManageEvent).toBe(false);
  });

  it('authorizes global admins without loading org memberships', () => {
    mockUseAdminAccess.mockReturnValue({
      adminUser: { userRole: UserRole.Admin },
      authToken: 'admin-token',
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      userId: 'admin-1',
    });

    const { result } = renderHook(() => useEventManagementAccess(orgEvent));

    expect(result.current.canManageEvent).toBe(true);
    expect(mockUseQuery).toHaveBeenCalledWith(
      GetMyOrganizationsDocument,
      expect.objectContaining({
        skip: true,
      }),
    );
  });
});
