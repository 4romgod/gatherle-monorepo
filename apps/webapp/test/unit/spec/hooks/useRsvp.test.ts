/**
 * Unit tests for useRsvp, useMyRsvpStatus, useMyRsvps, and useEventParticipants hooks.
 * Tests cover RSVP functionality including success cases, error handling, and loading states.
 */

// Mock @/lib/utils before imports to avoid ESM issues with jose
jest.mock('@/lib/utils', () => ({
  getAuthHeader: (token: string | undefined | null) => (token ? { Authorization: `Bearer ${token}` } : {}),
}));

import { renderHook, act } from '@testing-library/react';
import { ParticipantStatus, ParticipantVisibility } from '@/data/graphql/types/graphql';

// Mock data
const mockUserId = 'user-123';
const mockToken = 'mock-jwt-token';
const mockEventId = 'event-456';

const mockSession = {
  user: {
    userId: mockUserId,
    token: mockToken,
    username: 'testuser',
    email: 'test@example.com',
  },
  expires: '2026-12-31',
};

const mockRsvpResponse = {
  participantId: 'participant-789',
  eventId: mockEventId,
  userId: mockUserId,
  status: ParticipantStatus.Going,
  quantity: 1,
  sharedVisibility: ParticipantVisibility.Public,
  rsvpAt: '2026-01-18T10:00:00Z',
};

const mockCancelResponse = {
  participantId: 'participant-789',
  eventId: mockEventId,
  userId: mockUserId,
  status: ParticipantStatus.Cancelled,
  cancelledAt: '2026-01-18T11:00:00Z',
};

// Mock functions
const mockRsvpMutate = jest.fn();
const mockCancelMutate = jest.fn();
const mockQuery = jest.fn();
const mockRefetch = jest.fn();

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: mockSession, status: 'authenticated' })),
}));

// Mock @apollo/client
jest.mock('@apollo/client', () => ({
  useMutation: jest.fn(document => {
    // Determine which mutation based on document reference
    const docName = document?.definitions?.[0]?.name?.value || '';
    if (docName.includes('Cancel')) {
      return [mockCancelMutate, { loading: false, error: null }];
    }
    return [mockRsvpMutate, { loading: false, error: null }];
  }),
  useQuery: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: mockRefetch,
  })),
  gql: jest.fn((strings: TemplateStringsArray) => strings[0]),
}));

// Import hooks after mocks are set up
import { useRsvp, useMyRsvpStatus, useMyRsvps, useEventParticipants } from '@/hooks/useRsvp';
import { useMutation, useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';

describe('useRsvp Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRsvpMutate.mockResolvedValue({ data: { upsertEventParticipant: mockRsvpResponse } });
    mockCancelMutate.mockResolvedValue({ data: { cancelEventParticipant: mockCancelResponse } });
  });

  describe('authentication state', () => {
    it('should return isAuthenticated as true when user is logged in', () => {
      const { result } = renderHook(() => useRsvp());
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return isAuthenticated as false when user is not logged in', () => {
      (useSession as jest.Mock).mockReturnValueOnce({ data: null, status: 'unauthenticated' });

      const { result } = renderHook(() => useRsvp());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return isAuthenticated as false when session has no userId', () => {
      (useSession as jest.Mock).mockReturnValueOnce({
        data: { user: { token: mockToken }, expires: '2026-12-31' },
        status: 'authenticated',
      });

      const { result } = renderHook(() => useRsvp());
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('rsvpToEvent', () => {
    it('should call mutation with correct variables for default RSVP', async () => {
      const { result } = renderHook(() => useRsvp());

      await act(async () => {
        await result.current.rsvpToEvent(mockEventId);
      });

      expect(mockRsvpMutate).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: mockEventId,
            userId: mockUserId,
            status: ParticipantStatus.Going,
            quantity: 1,
            sharedVisibility: undefined,
          },
        },
      });
    });

    it('should call mutation with custom options', async () => {
      const { result } = renderHook(() => useRsvp());

      await act(async () => {
        await result.current.rsvpToEvent(mockEventId, {
          status: ParticipantStatus.Interested,
          quantity: 2,
          sharedVisibility: ParticipantVisibility.Followers,
        });
      });

      expect(mockRsvpMutate).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: mockEventId,
            userId: mockUserId,
            status: ParticipantStatus.Interested,
            quantity: 2,
            sharedVisibility: ParticipantVisibility.Followers,
          },
        },
      });
    });

    it('should throw error when user is not logged in', async () => {
      (useSession as jest.Mock).mockReturnValueOnce({ data: null, status: 'unauthenticated' });

      const { result } = renderHook(() => useRsvp());

      await expect(result.current.rsvpToEvent(mockEventId)).rejects.toThrow('User must be logged in to RSVP');
      expect(mockRsvpMutate).not.toHaveBeenCalled();
    });

    it('should return mutation result on success', async () => {
      const { result } = renderHook(() => useRsvp());

      let response;
      await act(async () => {
        response = await result.current.rsvpToEvent(mockEventId);
      });

      expect(response).toEqual({ data: { upsertEventParticipant: mockRsvpResponse } });
    });

    it('should propagate mutation errors', async () => {
      const mockError = new Error('Network error');
      mockRsvpMutate.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useRsvp());

      await expect(result.current.rsvpToEvent(mockEventId)).rejects.toThrow('Network error');
    });
  });

  describe('goingToEvent', () => {
    it('should call rsvpToEvent with Going status', async () => {
      const { result } = renderHook(() => useRsvp());

      await act(async () => {
        await result.current.goingToEvent(mockEventId);
      });

      expect(mockRsvpMutate).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: mockEventId,
            userId: mockUserId,
            status: ParticipantStatus.Going,
            quantity: 1,
            sharedVisibility: undefined,
          },
        },
      });
    });

    it('should accept custom quantity', async () => {
      const { result } = renderHook(() => useRsvp());

      await act(async () => {
        await result.current.goingToEvent(mockEventId, 3);
      });

      expect(mockRsvpMutate).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: mockEventId,
            userId: mockUserId,
            status: ParticipantStatus.Going,
            quantity: 3,
            sharedVisibility: undefined,
          },
        },
      });
    });
  });

  describe('interestedInEvent', () => {
    it('should call rsvpToEvent with Interested status and default quantity', async () => {
      const { result } = renderHook(() => useRsvp());

      await act(async () => {
        await result.current.interestedInEvent(mockEventId);
      });

      // interestedInEvent doesn't pass quantity, so rsvpToEvent defaults it to 1
      expect(mockRsvpMutate).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: mockEventId,
            userId: mockUserId,
            status: ParticipantStatus.Interested,
            quantity: 1,
            sharedVisibility: undefined,
          },
        },
      });
    });
  });

  describe('cancelRsvp', () => {
    it('should call cancel mutation with correct variables', async () => {
      const { result } = renderHook(() => useRsvp());

      await act(async () => {
        await result.current.cancelRsvp(mockEventId);
      });

      expect(mockCancelMutate).toHaveBeenCalledWith({
        variables: {
          input: {
            eventId: mockEventId,
            userId: mockUserId,
          },
        },
      });
    });

    it('should throw error when user is not logged in', async () => {
      (useSession as jest.Mock).mockReturnValueOnce({ data: null, status: 'unauthenticated' });

      const { result } = renderHook(() => useRsvp());

      await expect(result.current.cancelRsvp(mockEventId)).rejects.toThrow('User must be logged in to cancel RSVP');
      expect(mockCancelMutate).not.toHaveBeenCalled();
    });

    it('should return mutation result on success', async () => {
      const { result } = renderHook(() => useRsvp());

      let response;
      await act(async () => {
        response = await result.current.cancelRsvp(mockEventId);
      });

      expect(response).toEqual({ data: { cancelEventParticipant: mockCancelResponse } });
    });

    it('should propagate cancel mutation errors', async () => {
      const mockError = new Error('Cancel failed');
      mockCancelMutate.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useRsvp());

      await expect(result.current.cancelRsvp(mockEventId)).rejects.toThrow('Cancel failed');
    });
  });

  describe('loading states', () => {
    it('should return rsvpLoading from mutation', () => {
      (useMutation as jest.Mock).mockReturnValue([mockRsvpMutate, { loading: true, error: null }]);

      const { result } = renderHook(() => useRsvp());
      expect(result.current.rsvpLoading).toBe(true);
    });

    it('should return cancelLoading from mutation', () => {
      // First call for RSVP mutation
      (useMutation as jest.Mock)
        .mockReturnValueOnce([mockRsvpMutate, { loading: false, error: null }])
        // Second call for Cancel mutation
        .mockReturnValueOnce([mockCancelMutate, { loading: true, error: null }]);

      const { result } = renderHook(() => useRsvp());
      expect(result.current.cancelLoading).toBe(true);
    });

    it('should compute isLoading as OR of rsvpLoading and cancelLoading', () => {
      (useMutation as jest.Mock)
        .mockReturnValueOnce([mockRsvpMutate, { loading: true, error: null }])
        .mockReturnValueOnce([mockCancelMutate, { loading: false, error: null }]);

      const { result } = renderHook(() => useRsvp());
      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading as false when both mutations are idle', () => {
      (useMutation as jest.Mock)
        .mockReturnValueOnce([mockRsvpMutate, { loading: false, error: null }])
        .mockReturnValueOnce([mockCancelMutate, { loading: false, error: null }]);

      const { result } = renderHook(() => useRsvp());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Authorization header', () => {
    it('should configure mutations with Authorization header when authenticated', () => {
      renderHook(() => useRsvp());

      // Check that useMutation was called with context containing Authorization header
      expect(useMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          context: {
            headers: {
              Authorization: 'Bearer ' + mockToken,
            },
          },
        }),
      );
    });

    it('should configure mutations without Authorization header when not authenticated', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

      renderHook(() => useRsvp());

      // Check that useMutation was called with empty headers
      expect(useMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          context: {
            headers: {},
          },
        }),
      );
    });
  });
});

describe('useMyRsvpStatus Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ data: mockSession, status: 'authenticated' });
  });

  it('should query RSVP status for event', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { myRsvpStatus: mockRsvpResponse },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvpStatus(mockEventId));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { eventId: mockEventId },
        skip: false,
        fetchPolicy: 'cache-and-network',
        context: {
          headers: {
            Authorization: 'Bearer ' + mockToken,
          },
        },
      }),
    );
    expect(result.current.rsvp).toEqual(mockRsvpResponse);
    expect(result.current.status).toBe(ParticipantStatus.Going);
  });

  it('should skip query when token is not available', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    renderHook(() => useMyRsvpStatus(mockEventId));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: true,
      }),
    );
  });

  it('should skip query when eventId is empty', () => {
    renderHook(() => useMyRsvpStatus(''));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: true,
      }),
    );
  });

  it('should return null values when no data', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvpStatus(mockEventId));

    expect(result.current.rsvp).toBeNull();
    expect(result.current.status).toBeNull();
  });

  it('should return loading state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvpStatus(mockEventId));

    expect(result.current.loading).toBe(true);
  });

  it('should return error state', () => {
    const mockError = new Error('Query failed');
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvpStatus(mockEventId));

    expect(result.current.error).toBe(mockError);
  });

  it('should provide refetch function', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvpStatus(mockEventId));

    expect(result.current.refetch).toBe(mockRefetch);
  });
});

describe('useMyRsvps Hook', () => {
  const mockRsvps = [
    { ...mockRsvpResponse, eventId: 'event-1' },
    { ...mockRsvpResponse, eventId: 'event-2', status: ParticipantStatus.Interested },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ data: mockSession, status: 'authenticated' });
  });

  it('should query user RSVPs with default includeCancelled false', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { myRsvps: mockRsvps },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvps());

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { includeCancelled: false },
        skip: false,
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first',
        context: {
          headers: {
            Authorization: 'Bearer ' + mockToken,
          },
        },
      }),
    );
    expect(result.current.rsvps).toEqual(mockRsvps);
  });

  it('should query user RSVPs with includeCancelled true', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { myRsvps: mockRsvps },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderHook(() => useMyRsvps(true));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { includeCancelled: true },
      }),
    );
  });

  it('should skip query when token is not available', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    renderHook(() => useMyRsvps());

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: true,
      }),
    );
  });

  it('should return empty array when no data', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvps());

    expect(result.current.rsvps).toEqual([]);
  });

  it('should return loading state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvps());

    expect(result.current.loading).toBe(true);
  });

  it('should return error state', () => {
    const mockError = new Error('Query failed');
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvps());

    expect(result.current.error).toBe(mockError);
  });

  it('should provide refetch function', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useMyRsvps());

    expect(result.current.refetch).toBe(mockRefetch);
  });
});

describe('useEventParticipants Hook', () => {
  const mockParticipants = [
    {
      ...mockRsvpResponse,
      user: {
        userId: mockUserId,
        username: 'testuser',
        given_name: 'Test',
        family_name: 'User',
        profile_picture: null,
      },
    },
    {
      participantId: 'participant-002',
      eventId: mockEventId,
      userId: 'user-456',
      status: ParticipantStatus.Interested,
      quantity: 1,
      sharedVisibility: ParticipantVisibility.Public,
      rsvpAt: '2026-01-18T09:00:00Z',
      user: {
        userId: 'user-456',
        username: 'anotheruser',
        given_name: 'Another',
        family_name: 'User',
        profile_picture: 'https://example.com/avatar.jpg',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ data: mockSession, status: 'authenticated' });
  });

  it('should query event participants', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { readEventParticipants: mockParticipants },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEventParticipants(mockEventId));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { eventId: mockEventId },
        skip: false,
        fetchPolicy: 'cache-and-network',
        context: {
          headers: {
            Authorization: 'Bearer ' + mockToken,
          },
        },
      }),
    );
    expect(result.current.participants).toEqual(mockParticipants);
  });

  it('should skip query when eventId is empty', () => {
    renderHook(() => useEventParticipants(''));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: true,
      }),
    );
  });

  it('should return empty array when no data', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEventParticipants(mockEventId));

    expect(result.current.participants).toEqual([]);
  });

  it('should return loading state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEventParticipants(mockEventId));

    expect(result.current.loading).toBe(true);
  });

  it('should return error state', () => {
    const mockError = new Error('Query failed');
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEventParticipants(mockEventId));

    expect(result.current.error).toBe(mockError);
  });

  it('should provide refetch function', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEventParticipants(mockEventId));

    expect(result.current.refetch).toBe(mockRefetch);
  });

  it('should work without authentication (public query)', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });
    (useQuery as jest.Mock).mockReturnValue({
      data: { readEventParticipants: mockParticipants },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEventParticipants(mockEventId));

    // Should not skip query even without auth (public data)
    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: false,
        context: {
          headers: {},
        },
      }),
    );
    expect(result.current.participants).toEqual(mockParticipants);
  });
});
