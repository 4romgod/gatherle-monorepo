import { renderHook } from '@testing-library/react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { useEventManagementAccess } from '@/hooks/useEventManagementAccess';
import { GetMyOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { OrganizationRole, UserRole } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn((token?: string) => (token ? { Authorization: `Bearer ${token}` } : {})),
}));

const useQueryMock = useQuery as jest.Mock;
const useSessionMock = useSession as jest.Mock;
const getAuthHeaderMock = getAuthHeader as jest.Mock;

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
    useQueryMock.mockReturnValue(emptyQueryResult);
  });

  it('authorizes personal events for listed organizers without loading org memberships', () => {
    useSessionMock.mockReturnValue({
      data: { user: { token: 'user-token', userId: 'user-1', userRole: UserRole.User } },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useEventManagementAccess(personalEvent));

    expect(useQueryMock).toHaveBeenCalledWith(GetMyOrganizationsDocument, {
      fetchPolicy: 'cache-and-network',
      skip: true,
      context: { headers: { Authorization: 'Bearer user-token' } },
    });
    expect(result.current.canManageEvent).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('authorizes org-linked events for allowed org roles even when the viewer is not an organizer', () => {
    useSessionMock.mockReturnValue({
      data: { user: { token: 'user-token', userId: 'user-1', userRole: UserRole.User } },
      status: 'authenticated',
    });
    useQueryMock.mockReturnValue({
      data: {
        readMyOrganizations: [{ role: OrganizationRole.Admin, organization: { orgId: 'org-1', name: 'Org 1' } }],
      },
      loading: false,
    });

    const { result } = renderHook(() => useEventManagementAccess(orgEvent));

    expect(getAuthHeaderMock).toHaveBeenCalledWith('user-token');
    expect(useQueryMock).toHaveBeenCalledWith(
      GetMyOrganizationsDocument,
      expect.objectContaining({
        skip: false,
        context: { headers: { Authorization: 'Bearer user-token' } },
      }),
    );
    expect(result.current.canManageEvent).toBe(true);
  });

  it('denies org-linked event management when the membership role is not allowed', () => {
    useSessionMock.mockReturnValue({
      data: { user: { token: 'user-token', userId: 'user-1', userRole: UserRole.User } },
      status: 'authenticated',
    });
    useQueryMock.mockReturnValue({
      data: {
        readMyOrganizations: [{ role: OrganizationRole.Member, organization: { orgId: 'org-1', name: 'Org 1' } }],
      },
      loading: false,
    });

    const { result } = renderHook(() => useEventManagementAccess(orgEvent));

    expect(result.current.canManageEvent).toBe(false);
  });

  it('authorizes global admins without loading org memberships', () => {
    useSessionMock.mockReturnValue({
      data: { user: { token: 'admin-token', userId: 'admin-1', userRole: UserRole.Admin } },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useEventManagementAccess(orgEvent));

    expect(useQueryMock).toHaveBeenCalledWith(
      GetMyOrganizationsDocument,
      expect.objectContaining({
        skip: true,
      }),
    );
    expect(result.current.canManageEvent).toBe(true);
  });
});
