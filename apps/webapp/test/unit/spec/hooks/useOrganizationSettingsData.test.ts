import { act, renderHook } from '@testing-library/react';
import { OrganizationRole } from '@/data/graphql/types/graphql';
import useOrganizationSettingsData from '@/hooks/useOrganizationSettingsData';
import { ROUTES } from '@/lib/constants';

const mockUseSession = jest.fn();
const mockPush = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(),
  useLazyQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  __esModule: true,
  getAuthHeader: jest.fn(() => ({ Authorization: 'Bearer token' })),
}));

const {
  useQuery: useQueryMock,
  useLazyQuery: useLazyQueryMock,
  useMutation: useMutationMock,
} = require('@apollo/client');

const defaultOrganization = {
  orgId: 'org-1',
  name: 'Test Org',
} as any;

const defaultMemberships = [{ membershipId: 'membership-1', userId: 'user-1' }] as any[];

const setupQueries = (organization: any | null = defaultOrganization, memberships: any[] = defaultMemberships) => {
  const hasOrganization = organization !== null && organization !== undefined;
  useQueryMock
    .mockImplementationOnce(() => ({
      data: hasOrganization ? { readOrganizationBySlug: organization } : undefined,
      loading: false,
    }))
    .mockImplementationOnce(() => ({
      data: { readOrganizationMembershipsByOrgId: memberships },
      loading: false,
      refetch: jest.fn(),
    }));
};

const setupMutations = () => {
  const updateOrganization = jest.fn().mockResolvedValue({});
  const removeOrganization = jest.fn().mockResolvedValue({});
  const createMembership = jest.fn().mockResolvedValue({});
  const updateMembership = jest.fn().mockResolvedValue({});
  const deleteMembership = jest.fn().mockResolvedValue({});

  useMutationMock
    .mockImplementationOnce(() => [updateOrganization, { loading: false }])
    .mockImplementationOnce(() => [removeOrganization, { loading: false }])
    .mockImplementationOnce(() => [createMembership, { loading: false }])
    .mockImplementationOnce(() => [updateMembership, { loading: false }])
    .mockImplementationOnce(() => [deleteMembership, { loading: false }]);

  return {
    updateOrganization,
    removeOrganization,
    createMembership,
    updateMembership,
    deleteMembership,
  };
};

const setupLazyQuery = (users: any[] = [{ userId: 'user-1' }]) => {
  const searchUsersQuery = jest.fn().mockResolvedValue({ data: { readUsers: users } });
  useLazyQueryMock.mockReturnValue([searchUsersQuery, { loading: false }]);
  return searchUsersQuery;
};

describe('useOrganizationSettingsData', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    mockPush.mockReset();
    useQueryMock.mockReset();
    useLazyQueryMock.mockReset();
    useMutationMock.mockReset();
  });

  it('builds search users options and returns results', async () => {
    setupQueries();
    setupMutations();
    const searchUsersQuery = setupLazyQuery([{ userId: 'user-42' }]);

    const { result } = renderHook(() => useOrganizationSettingsData('org-slug'));

    let users;
    await act(async () => {
      users = await result.current.searchUsers('  Jazz  ');
    });

    expect(searchUsersQuery).toHaveBeenCalledWith({
      variables: {
        options: {
          pagination: { limit: 50 },
          search: {
            fields: ['username', 'email', 'given_name', 'family_name'],
            value: 'Jazz',
          },
        },
      },
    });
    expect(users).toEqual([{ userId: 'user-42' }]);
  });

  it('returns empty results when search term is blank', async () => {
    setupQueries();
    setupMutations();
    const searchUsersQuery = setupLazyQuery();

    const { result } = renderHook(() => useOrganizationSettingsData('org-slug'));

    let users;
    await act(async () => {
      users = await result.current.searchUsers('   ');
    });

    expect(searchUsersQuery).not.toHaveBeenCalled();
    expect(users).toEqual([]);
  });

  it('updates organization with normalized tags', async () => {
    setupQueries();
    const { updateOrganization } = setupMutations();
    setupLazyQuery();

    const { result } = renderHook(() => useOrganizationSettingsData('org-slug'));

    await act(async () => {
      await result.current.saveOrganization({
        name: 'Updated Org',
        description: '',
        logo: '',
        billingEmail: '',
        tags: 'alpha, beta',
      } as any);
    });

    expect(updateOrganization).toHaveBeenCalledWith({
      variables: {
        input: {
          orgId: 'org-1',
          name: 'Updated Org',
          description: null,
          logo: null,
          billingEmail: null,
          tags: ['alpha', 'beta'],
        },
      },
    });
  });

  it('throws when saving without organization loaded', async () => {
    setupQueries(null, []);
    setupMutations();
    setupLazyQuery();

    const { result } = renderHook(() => useOrganizationSettingsData('org-slug'));

    await expect(result.current.saveOrganization({ name: 'No Org' } as any)).rejects.toThrow('Organization not loaded');
  });

  it('deletes organization and redirects', async () => {
    setupQueries();
    const { removeOrganization } = setupMutations();
    setupLazyQuery();

    const { result } = renderHook(() => useOrganizationSettingsData('org-slug'));

    await act(async () => {
      await result.current.deleteOrganization();
    });

    expect(removeOrganization).toHaveBeenCalledWith({
      variables: { orgId: 'org-1' },
    });
    expect(mockPush).toHaveBeenCalledWith(ROUTES.ACCOUNT.ORGANIZATIONS.ROOT);
  });

  it('manages organization memberships', async () => {
    setupQueries();
    const { createMembership, updateMembership, deleteMembership } = setupMutations();
    setupLazyQuery();

    const { result } = renderHook(() => useOrganizationSettingsData('org-slug'));

    await act(async () => {
      await result.current.addOrganizationMembership({ userId: 'user-9' } as any, OrganizationRole.Admin);
    });

    await act(async () => {
      await result.current.updateOrganizationMembershipRole('membership-1', OrganizationRole.Host);
    });

    await act(async () => {
      await result.current.deleteOrganizationMembership('membership-1');
    });

    expect(createMembership).toHaveBeenCalledWith({
      variables: {
        input: {
          orgId: 'org-1',
          userId: 'user-9',
          role: OrganizationRole.Admin,
        },
      },
    });
    expect(updateMembership).toHaveBeenCalledWith({
      variables: {
        input: {
          membershipId: 'membership-1',
          role: OrganizationRole.Host,
        },
      },
    });
    expect(deleteMembership).toHaveBeenCalledWith({
      variables: {
        input: { membershipId: 'membership-1' },
      },
    });
  });
});
