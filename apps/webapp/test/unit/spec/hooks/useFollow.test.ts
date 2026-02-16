import { act, renderHook } from '@testing-library/react';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import {
  useFollow,
  useFollowRequests,
  useFollowing,
  useFollowers,
  useMuteUser,
  useMuteOrganization,
  useMutedUsers,
  useMutedOrganizations,
  useRemoveFollower,
} from '@/hooks/useFollow';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useApolloClient: jest.fn(),
}));

const {
  useMutation: useMutationMock,
  useQuery: useQueryMock,
  useApolloClient: useApolloClientMock,
} = require('@apollo/client');

jest.mock('@/lib/utils', () => ({
  __esModule: true,
  getAuthHeader: jest.fn(() => ({})),
}));

describe('useFollow and related hooks', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useMutationMock.mockReset();
    useQueryMock.mockReset();
    useApolloClientMock.mockReturnValue({
      cache: {
        updateQuery: jest.fn(),
      },
    });
  });

  it('provides follow/unfollow actions', async () => {
    const followMutation = jest.fn().mockResolvedValue({});
    const unfollowMutation = jest.fn().mockResolvedValue({});

    useMutationMock
      .mockImplementationOnce(() => [followMutation, { loading: false }])
      .mockImplementationOnce(() => [unfollowMutation, { loading: false }]);

    const { result } = renderHook(() => useFollow());

    await act(async () => {
      await result.current.follow(FollowTargetType.Event, 'target-1');
    });
    await act(async () => {
      await result.current.unfollow(FollowTargetType.Event, 'target-1');
    });

    expect(followMutation).toHaveBeenCalledWith({
      variables: { input: { targetType: FollowTargetType.Event, targetId: 'target-1' } },
    });
    expect(unfollowMutation).toHaveBeenCalledWith({
      variables: { targetType: FollowTargetType.Event, targetId: 'target-1' },
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('returns following list from query', () => {
    const refetch = jest.fn();
    useQueryMock.mockReturnValue({
      data: { readFollowing: [{ userId: 'user-1' }] },
      loading: false,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(() => useFollowing());

    expect(result.current.following).toEqual([{ userId: 'user-1' }]);
    expect(result.current.refetch).toBe(refetch);
  });

  it('returns followers when targetId is provided', () => {
    const refetch = jest.fn();
    useQueryMock.mockReturnValue({
      data: { readFollowers: [{ userId: 'user-2' }] },
      loading: false,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(() => useFollowers(FollowTargetType.Organization, 'org-1'));

    expect(result.current.followers).toEqual([{ userId: 'user-2' }]);
    expect(result.current.refetch).toBe(refetch);
  });

  it('handles follow requests actions', async () => {
    const refetch = jest.fn();
    const updateQuery = jest.fn();
    useApolloClientMock.mockReturnValue({
      cache: {
        updateQuery,
      },
    });
    useQueryMock.mockReturnValue({
      data: { readFollowRequests: [{ followId: 'req-1' }] },
      loading: false,
      error: undefined,
      refetch,
    });

    const acceptMutation = jest.fn().mockResolvedValue({});
    const rejectMutation = jest.fn().mockResolvedValue({});

    useMutationMock
      .mockImplementationOnce(() => [acceptMutation, { loading: false }])
      .mockImplementationOnce(() => [rejectMutation, { loading: false }]);

    const { result } = renderHook(() => useFollowRequests(FollowTargetType.User));

    await act(async () => {
      await result.current.accept('req-1');
    });
    await act(async () => {
      await result.current.reject('req-1');
    });

    expect(acceptMutation).toHaveBeenCalledWith({ variables: { followId: 'req-1' } });
    expect(rejectMutation).toHaveBeenCalledWith({ variables: { followId: 'req-1' } });
    expect(updateQuery).toHaveBeenCalledTimes(2);
    expect(result.current.requests).toEqual([{ followId: 'req-1' }]);
  });

  it('provides mute/unmute helpers for users', async () => {
    const muteMutation = jest.fn().mockResolvedValue({});
    const unmuteMutation = jest.fn().mockResolvedValue({});

    useMutationMock
      .mockImplementationOnce(() => [muteMutation, { loading: false }])
      .mockImplementationOnce(() => [unmuteMutation, { loading: false }]);

    const { result } = renderHook(() => useMuteUser());

    await act(async () => {
      await result.current.muteUser('muted-1');
    });
    await act(async () => {
      await result.current.unmuteUser('muted-1');
    });

    expect(muteMutation).toHaveBeenCalledWith({ variables: { mutedUserId: 'muted-1' } });
    expect(unmuteMutation).toHaveBeenCalledWith({ variables: { mutedUserId: 'muted-1' } });
    expect(result.current.loading).toBe(false);
  });

  it('returns muted users list', () => {
    const refetch = jest.fn();
    useQueryMock.mockReturnValue({
      data: { readMutedUsers: [{ userId: 'muted-1' }] },
      loading: false,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(() => useMutedUsers());

    expect(result.current.mutedUsers).toEqual([{ userId: 'muted-1' }]);
    expect(result.current.refetch).toBe(refetch);
  });

  it('provides mute/unmute helpers for organizations', async () => {
    const muteMutation = jest.fn().mockResolvedValue({});
    const unmuteMutation = jest.fn().mockResolvedValue({});

    useMutationMock
      .mockImplementationOnce(() => [muteMutation, { loading: false }])
      .mockImplementationOnce(() => [unmuteMutation, { loading: false }]);

    const { result } = renderHook(() => useMuteOrganization());

    await act(async () => {
      await result.current.muteOrganization('org-1');
    });
    await act(async () => {
      await result.current.unmuteOrganization('org-1');
    });

    expect(muteMutation).toHaveBeenCalledWith({ variables: { organizationId: 'org-1' } });
    expect(unmuteMutation).toHaveBeenCalledWith({ variables: { organizationId: 'org-1' } });
    expect(result.current.loading).toBe(false);
  });

  it('returns muted organization ids list', () => {
    const refetch = jest.fn();
    useQueryMock.mockReturnValue({
      data: { readMutedOrganizationIds: ['org-1', 'org-2'] },
      loading: false,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(() => useMutedOrganizations());

    expect(result.current.mutedOrgIds).toEqual(['org-1', 'org-2']);
    expect(result.current.refetch).toBe(refetch);
  });

  it('allows removing followers', async () => {
    const mutation = jest.fn().mockResolvedValue({});
    useMutationMock.mockReturnValue([mutation, { loading: false }]);

    const { result } = renderHook(() => useRemoveFollower());

    await act(async () => {
      await result.current.removeFollower('follower-1', FollowTargetType.User);
    });

    expect(mutation).toHaveBeenCalledWith({
      variables: { followerUserId: 'follower-1', targetType: FollowTargetType.User },
    });
  });
});
