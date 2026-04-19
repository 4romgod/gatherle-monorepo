import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserAvatarMomentsRing from '@/components/eventMoments/UserAvatarMomentsRing';
import type { ReadUserEventMomentsQuery } from '@/data/graphql/types/graphql';

type Moment = ReadUserEventMomentsQuery['readUserEventMoments'][number];

const mockUseQuery = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@/data/graphql/query', () => ({
  ReadUserEventMomentsDocument: {},
}));

jest.mock('@/data/graphql/types/graphql', () => ({
  EventMomentState: { Ready: 'READY' },
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: () => ({ Authorization: 'Bearer test-token' }),
}));

// Capture EventMomentViewer calls so we can inspect the props it was called with
let lastViewerProps: Record<string, unknown> | null = null;
jest.mock('@/components/eventMoments/EventMomentViewer', () => {
  const MockViewer = (props: Record<string, unknown>) => {
    lastViewerProps = props;
    return null;
  };
  MockViewer.displayName = 'EventMomentViewer';
  return { __esModule: true, default: MockViewer };
});

const testTheme = createTheme({
  palette: {
    hero: {
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      background: '#1a1a2e',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      overlay: 'rgba(0,0,0,0.4)',
      cardBg: '#f5f5f5',
      cardBorder: '#e0e0e0',
    } as unknown,
  } as unknown,
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);
}

const defaultProps = {
  userId: 'user-123',
  avatarSrc: undefined,
  displayName: 'Test User',
  events: [] as { eventId: string; title: string }[],
  token: 'mock-token',
  isOwnProfile: false,
};

function makeMoment(overrides: Record<string, unknown> = {}): Moment {
  return {
    momentId: `moment-${Math.random().toString(36).slice(2)}`,
    eventId: 'event-1',
    authorId: 'user-123',
    type: 'Image',
    state: 'READY',
    caption: 'A test moment',
    mediaUrl: 'https://cdn.example.com/img.jpg',
    thumbnailUrl: null,
    background: null,
    durationSeconds: null,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    author: {
      userId: 'user-123',
      username: 'testuser',
      given_name: 'Test',
      family_name: 'User',
      profile_picture: null,
    },
    event: null,
    ...overrides,
  } as unknown as Moment;
}

describe('UserAvatarMomentsRing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastViewerProps = null;
  });

  it('renders a plain Avatar (no ring, no button) when the events array is empty', () => {
    renderWithTheme(<UserAvatarMomentsRing {...defaultProps} events={[]} />);

    expect(screen.queryByRole('button')).toBeNull();
    // Avatar box is still present in the DOM
    expect(document.querySelector('.MuiAvatar-root')).toBeTruthy();
  });

  it('renders a plain Avatar when events have no ready moments', async () => {
    mockUseQuery.mockReturnValue({ data: { readUserEventMoments: [] }, loading: false });

    await act(async () => {
      renderWithTheme(
        <UserAvatarMomentsRing {...defaultProps} events={[{ eventId: 'event-1', title: 'Summer Meetup' }]} />,
      );
    });

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a clickable ring button when the user has active moments', async () => {
    mockUseQuery.mockReturnValue({ data: { readUserEventMoments: [makeMoment()] }, loading: false });

    await act(async () => {
      renderWithTheme(
        <UserAvatarMomentsRing {...defaultProps} events={[{ eventId: 'event-1', title: 'Summer Meetup' }]} />,
      );
    });

    expect(screen.getByRole('button', { name: /Test User.*moments/i })).toBeTruthy();
  });

  it('renders no viewer before the avatar ring is clicked', async () => {
    mockUseQuery.mockReturnValue({ data: { readUserEventMoments: [makeMoment()] }, loading: false });

    await act(async () => {
      renderWithTheme(
        <UserAvatarMomentsRing {...defaultProps} events={[{ eventId: 'event-1', title: 'Summer Meetup' }]} />,
      );
    });

    // Viewer rendered with open=false before click
    expect((lastViewerProps as { open: boolean } | null)?.open).toBe(false);
  });

  it('opens the EventMomentViewer when the ring avatar is clicked', async () => {
    mockUseQuery.mockReturnValue({ data: { readUserEventMoments: [makeMoment()] }, loading: false });

    await act(async () => {
      renderWithTheme(
        <UserAvatarMomentsRing {...defaultProps} events={[{ eventId: 'event-1', title: 'Summer Meetup' }]} />,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /moments/i }));
    });

    expect((lastViewerProps as { open: boolean } | null)?.open).toBe(true);
  });

  it('passes organizerIds=[userId] when isOwnProfile is true', async () => {
    mockUseQuery.mockReturnValue({ data: { readUserEventMoments: [makeMoment()] }, loading: false });

    await act(async () => {
      renderWithTheme(
        <UserAvatarMomentsRing
          {...defaultProps}
          isOwnProfile={true}
          events={[{ eventId: 'event-1', title: 'Summer Meetup' }]}
        />,
      );
    });

    expect((lastViewerProps as { organizerIds: string[] } | null)?.organizerIds).toContain('user-123');
  });

  it('passes empty organizerIds when isOwnProfile is false', async () => {
    mockUseQuery.mockReturnValue({ data: { readUserEventMoments: [makeMoment()] }, loading: false });

    await act(async () => {
      renderWithTheme(
        <UserAvatarMomentsRing
          {...defaultProps}
          isOwnProfile={false}
          events={[{ eventId: 'event-1', title: 'Summer Meetup' }]}
        />,
      );
    });

    expect((lastViewerProps as { organizerIds: string[] } | null)?.organizerIds).toHaveLength(0);
  });

  it('queries each event with the correct userId and eventId', async () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    await act(async () => {
      renderWithTheme(
        <UserAvatarMomentsRing
          {...defaultProps}
          userId="owner-99"
          events={[
            { eventId: 'event-abc', title: 'Event A' },
            { eventId: 'event-xyz', title: 'Event B' },
          ]}
        />,
      );
    });

    const calls = mockUseQuery.mock.calls as Array<[unknown, { variables: { userId: string; eventId: string } }]>;
    const variablesList = calls.map((c) => c[1].variables);

    expect(variablesList).toContainEqual({ userId: 'owner-99', eventId: 'event-abc' });
    expect(variablesList).toContainEqual({ userId: 'owner-99', eventId: 'event-xyz' });
  });

  it('renders no fetchers and no button when token is undefined', () => {
    renderWithTheme(
      <UserAvatarMomentsRing {...defaultProps} token={undefined} events={[{ eventId: 'e1', title: 'E' }]} />,
    );

    // No useQuery calls — EventMomentsFetcher not rendered without a token
    expect(mockUseQuery).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
