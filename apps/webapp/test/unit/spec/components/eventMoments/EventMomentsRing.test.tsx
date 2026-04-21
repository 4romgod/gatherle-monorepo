import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EventMomentsRing from '@/components/eventMoments/EventMomentsRing';
import { ParticipantStatus } from '@/data/graphql/types/graphql';

const mockUseSession = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@/data/graphql/query', () => ({
  ReadEventMomentsDocument: {},
}));

jest.mock('@/data/graphql/types/graphql', () => ({
  EventMomentState: { UploadPending: 'UploadPending', Transcoding: 'Transcoding', Ready: 'Ready', Failed: 'Failed' },
  ParticipantStatus: { Going: 'Going', CheckedIn: 'CheckedIn', Interested: 'Interested' },
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: () => ({ Authorization: 'Bearer test-token' }),
}));

const startPolling = jest.fn();
const stopPolling = jest.fn();

const baseMoment = {
  momentId: 'moment-1',
  eventId: 'event-1',
  authorId: 'viewer-1',
  type: 'Video',
  state: 'UploadPending',
  caption: 'Processing clip',
  mediaUrl: 'https://cdn.example.com/raw.mp4',
  thumbnailUrl: null,
  background: null,
  durationSeconds: null,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  createdAt: new Date().toISOString(),
  author: {
    userId: 'viewer-1',
    username: 'viewer',
    given_name: 'Viewer',
    family_name: 'User',
    profile_picture: null,
  },
};

describe('EventMomentsRing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { token: 'test-token', userId: 'viewer-1' } },
    });
  });

  it('opens the viewer for an own pending-only moment so it can be deleted', () => {
    const onMomentClick = jest.fn();

    mockUseQuery.mockReturnValue({
      data: { readEventMoments: { items: [baseMoment] } },
      loading: false,
      startPolling,
      stopPolling,
    });

    render(
      <EventMomentsRing
        eventId="event-1"
        myRsvpStatus={ParticipantStatus.Going}
        onAddClick={jest.fn()}
        onMomentClick={onMomentClick}
      />,
    );

    fireEvent.click(screen.getByText(/Pending/).parentElement!);

    expect(onMomentClick).toHaveBeenCalledWith([baseMoment], 0);
  });
});
