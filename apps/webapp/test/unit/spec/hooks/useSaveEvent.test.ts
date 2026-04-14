import { act, renderHook } from '@testing-library/react';
import { FollowTargetType } from '@/data/graphql/types/graphql';
import { useSaveEvent, useSavedEvents, useIsEventSaved } from '@/hooks/useSaveEvent';

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

describe('useSaveEvent', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useMutationMock.mockReset();
  });

  it('exposes save and unsave helpers', async () => {
    const saveMutation = jest.fn().mockResolvedValue({});
    const unsaveMutation = jest.fn().mockResolvedValue({});

    useMutationMock
      .mockImplementationOnce(() => [saveMutation, { loading: false }])
      .mockImplementationOnce(() => [unsaveMutation, { loading: false }]);

    const { result } = renderHook(() => useSaveEvent());

    await act(async () => {
      await result.current.saveEvent('event-1');
    });
    await act(async () => {
      await result.current.unsaveEvent('event-2');
    });
    await act(async () => {
      await result.current.toggleSave('event-3', false);
      await result.current.toggleSave('event-4', true);
    });

    expect(saveMutation).toHaveBeenCalledWith({
      variables: { input: { targetType: FollowTargetType.Event, targetId: 'event-1' } },
    });
    expect(unsaveMutation).toHaveBeenCalledWith({
      variables: { targetType: FollowTargetType.Event, targetId: 'event-2' },
    });
    expect(saveMutation).toHaveBeenCalledWith({
      variables: { input: { targetType: FollowTargetType.Event, targetId: 'event-3' } },
    });
    expect(unsaveMutation).toHaveBeenCalledWith({
      variables: { targetType: FollowTargetType.Event, targetId: 'event-4' },
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useSavedEvents', () => {
  it('returns saved events list', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    const refetch = jest.fn();
    useQueryMock.mockReturnValue({
      data: { readSavedEvents: [{ eventId: 'saved-1' }] },
      loading: false,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(() => useSavedEvents());
    expect(result.current.savedEvents).toEqual([{ eventId: 'saved-1' }]);
    expect(result.current.refetch).toBe(refetch);
  });

  it('returns empty array when no saved events data', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: jest.fn() });

    const { result } = renderHook(() => useSavedEvents());
    expect(result.current.savedEvents).toEqual([]);
  });

  it('skips query when token is missing', () => {
    mockUseSession.mockReturnValue({ data: null });
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: jest.fn() });

    renderHook(() => useSavedEvents());

    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skip: true }));
  });
});

describe('useIsEventSaved', () => {
  it('returns saved flag from query', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useQueryMock.mockReturnValue({
      data: { isEventSaved: true },
      loading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useIsEventSaved('event-1'));
    expect(result.current.isSaved).toBe(true);
  });

  it('returns false when no data', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: jest.fn() });

    const { result } = renderHook(() => useIsEventSaved('event-1'));
    expect(result.current.isSaved).toBe(false);
  });

  it('skips query when token is missing', () => {
    mockUseSession.mockReturnValue({ data: null });
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: jest.fn() });

    renderHook(() => useIsEventSaved('event-1'));

    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skip: true }));
  });

  it('skips query when eventId is empty', () => {
    mockUseSession.mockReturnValue({ data: { user: { token: 'token' } } });
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined, refetch: jest.fn() });

    renderHook(() => useIsEventSaved(''));

    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skip: true }));
  });
});
