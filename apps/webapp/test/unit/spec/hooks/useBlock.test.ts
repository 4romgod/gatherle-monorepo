import { act, renderHook } from '@testing-library/react';
import { useBlock, useBlockedUsers } from '@/hooks/useBlock';

const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  __esModule: true,
  getAuthHeader: jest.fn(() => ({})),
}));

const { useMutation: useMutationMock, useQuery: useQueryMock } = require('@apollo/client');

describe('useBlock hook', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'test-token' } } });
    useMutationMock.mockReset();
  });

  it('calls the block and unblock mutations with the correct arguments', async () => {
    const blockMutation = jest.fn().mockResolvedValue({});
    const unblockMutation = jest.fn().mockResolvedValue({});

    useMutationMock
      .mockImplementationOnce(() => [blockMutation, { loading: false }])
      .mockImplementationOnce(() => [unblockMutation, { loading: false }]);

    const { result } = renderHook(() => useBlock());

    await act(async () => {
      await result.current.blockUser('user-123');
    });
    await act(async () => {
      await result.current.unblockUser('user-123');
    });

    expect(blockMutation).toHaveBeenCalledWith({ variables: { blockedUserId: 'user-123' } });
    expect(unblockMutation).toHaveBeenCalledWith({ variables: { blockedUserId: 'user-123' } });
    expect(result.current.isLoading).toBe(false);
  });

  it('reports loading state when mutations are in flight', () => {
    const blockMutation = jest.fn();
    const unblockMutation = jest.fn();

    useMutationMock
      .mockImplementationOnce(() => [blockMutation, { loading: true }])
      .mockImplementationOnce(() => [unblockMutation, { loading: false }]);

    const { result } = renderHook(() => useBlock());

    expect(result.current.blockLoading).toBe(true);
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useBlockedUsers hook', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'test-token' } } });
    useQueryMock.mockReset();
  });

  it('returns blocked users from the query result', () => {
    const refetch = jest.fn();
    useQueryMock.mockReturnValue({
      data: { readBlockedUsers: [{ userId: 'blocked-1' }] },
      loading: false,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(() => useBlockedUsers());

    expect(result.current.blockedUsers).toEqual([{ userId: 'blocked-1' }]);
    expect(result.current.loading).toBe(false);
    expect(result.current.refetch).toBe(refetch);
  });
});
