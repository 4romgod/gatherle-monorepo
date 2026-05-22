import { renderHook } from '@testing-library/react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { GetMyOrganizationsDocument, GetOrganizationsDocument } from '@/data/graphql/query';
import { OrganizationRole, UserRole } from '@/data/graphql/types/graphql';
import { useVenueManagementAccess } from '@/hooks/useVenueManagementAccess';
import { getAuthHeader } from '@/lib/utils/auth';

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn((token?: string) => (token ? { authorization: `Bearer ${token}` } : {})),
}));

const useQueryMock = useQuery as jest.Mock;
const useSessionMock = useSession as jest.Mock;
const getAuthHeaderMock = getAuthHeader as jest.Mock;

const emptyQueryResult = {
  data: undefined,
  loading: false,
};

describe('useVenueManagementAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQueryMock.mockReturnValue(emptyQueryResult);
  });

  it('skips organization queries and denies venue management for guests', () => {
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' });

    const { result } = renderHook(() => useVenueManagementAccess());

    expect(useQueryMock).toHaveBeenNthCalledWith(1, GetMyOrganizationsDocument, {
      fetchPolicy: 'cache-and-network',
      skip: true,
      context: { headers: {} },
    });
    expect(useQueryMock).toHaveBeenNthCalledWith(2, GetOrganizationsDocument, {
      fetchPolicy: 'cache-and-network',
      skip: true,
      context: { headers: {} },
    });
    expect(getAuthHeaderMock).toHaveBeenCalledWith(undefined);
    expect(result.current.canCreateVenue).toBe(false);
    expect(result.current.canManageVenue('org-1')).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.manageableOrganizations).toEqual([]);
  });

  it('allows organization owners and admins to manage their organization venues', () => {
    useSessionMock.mockReturnValue({
      data: { user: { token: 'user-token', userRole: UserRole.User } },
      status: 'authenticated',
    });
    useQueryMock
      .mockReturnValueOnce({
        data: {
          readMyOrganizations: [
            { role: OrganizationRole.Owner, organization: { orgId: 'owner-org', name: 'Owner Org' } },
            { role: OrganizationRole.Admin, organization: { orgId: 'admin-org', name: 'Admin Org' } },
            { role: OrganizationRole.Member, organization: { orgId: 'member-org', name: 'Member Org' } },
          ],
        },
        loading: false,
      })
      .mockReturnValueOnce(emptyQueryResult);

    const { result } = renderHook(() => useVenueManagementAccess());

    expect(useQueryMock).toHaveBeenNthCalledWith(
      1,
      GetMyOrganizationsDocument,
      expect.objectContaining({
        skip: false,
        context: { headers: { authorization: 'Bearer user-token' } },
      }),
    );
    expect(useQueryMock).toHaveBeenNthCalledWith(2, GetOrganizationsDocument, expect.objectContaining({ skip: true }));
    expect(result.current.isGlobalAdmin).toBe(false);
    expect(result.current.canCreateVenue).toBe(true);
    expect(result.current.canManageVenue('owner-org')).toBe(true);
    expect(result.current.canManageVenue('admin-org')).toBe(true);
    expect(result.current.canManageVenue('member-org')).toBe(false);
    expect(result.current.canManageVenue(null)).toBe(false);
    expect(result.current.manageableOrganizations).toEqual([
      { orgId: 'owner-org', name: 'Owner Org', role: OrganizationRole.Owner },
      { orgId: 'admin-org', name: 'Admin Org', role: OrganizationRole.Admin },
    ]);
  });

  it('allows global admins to create and manage venues across organizations', () => {
    useSessionMock.mockReturnValue({
      data: { user: { token: 'admin-token', userRole: UserRole.Admin } },
      status: 'authenticated',
    });
    useQueryMock.mockReturnValueOnce(emptyQueryResult).mockReturnValueOnce({
      data: {
        readOrganizations: [
          { orgId: 'org-1', name: 'First Org' },
          { orgId: 'org-2', name: 'Second Org' },
        ],
      },
      loading: false,
    });

    const { result } = renderHook(() => useVenueManagementAccess());

    expect(useQueryMock).toHaveBeenNthCalledWith(
      1,
      GetMyOrganizationsDocument,
      expect.objectContaining({ skip: false }),
    );
    expect(useQueryMock).toHaveBeenNthCalledWith(
      2,
      GetOrganizationsDocument,
      expect.objectContaining({
        skip: false,
        context: { headers: { authorization: 'Bearer admin-token' } },
      }),
    );
    expect(result.current.isGlobalAdmin).toBe(true);
    expect(result.current.canCreateVenue).toBe(true);
    expect(result.current.canManageVenue(null)).toBe(true);
    expect(result.current.canManageVenue('unknown-org')).toBe(true);
    expect(result.current.manageableOrganizations).toEqual([
      { orgId: 'org-1', name: 'First Org', role: UserRole.Admin },
      { orgId: 'org-2', name: 'Second Org', role: UserRole.Admin },
    ]);
  });

  it('reports loading while session or required organization data is loading', () => {
    useSessionMock.mockReturnValue({
      data: { user: { token: 'admin-token', userRole: UserRole.Admin } },
      status: 'loading',
    });
    useQueryMock
      .mockReturnValueOnce({ data: undefined, loading: true })
      .mockReturnValueOnce({ data: undefined, loading: true });

    const { result } = renderHook(() => useVenueManagementAccess());

    expect(result.current.loading).toBe(true);
    expect(result.current.manageableOrganizations).toEqual([]);
  });
});
