import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserProfileMomentsBar from '@/components/eventMoments/UserProfileMomentsBar';

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

jest.mock('@/components/eventMoments/EventMomentViewer', () => {
  const MockViewer = () => null;
  MockViewer.displayName = 'EventMomentViewer';
  return MockViewer;
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
  token: 'mock-token',
  isOwnProfile: false,
};

function makeMoment(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

describe('UserProfileMomentsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the events array is empty', () => {
    const { container } = renderWithTheme(<UserProfileMomentsBar {...defaultProps} events={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the outer container (non-null) when events are provided', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    const { container } = renderWithTheme(
      <UserProfileMomentsBar {...defaultProps} events={[{ eventId: 'event-1', title: 'Summer Meetup' }]} />,
    );

    // Component renders something (not null) when events.length > 0
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a loading skeleton for each event bubble while loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    const events = [
      { eventId: 'event-1', title: 'Event One' },
      { eventId: 'event-2', title: 'Event Two' },
    ];

    const { container } = renderWithTheme(<UserProfileMomentsBar {...defaultProps} events={events} />);

    // Each loading bubble renders 2 skeletons (circle + text)
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(events.length * 2);
  });

  it('renders no bubble content when the event has no ready moments', () => {
    mockUseQuery.mockReturnValue({
      data: { readUserEventMoments: [] },
      loading: false,
    });

    renderWithTheme(
      <UserProfileMomentsBar {...defaultProps} events={[{ eventId: 'event-1', title: 'Empty Event' }]} />,
    );

    // No avatar bubbles or event title labels rendered
    expect(screen.queryByText('Empty Event')).toBeNull();
  });

  it('renders the event title label for an event with ready moments', () => {
    mockUseQuery.mockReturnValue({
      data: { readUserEventMoments: [makeMoment()] },
      loading: false,
    });

    renderWithTheme(
      <UserProfileMomentsBar {...defaultProps} events={[{ eventId: 'event-1', title: 'Summer Meetup' }]} />,
    );

    expect(screen.getByText('Summer Meetup')).toBeTruthy();
  });

  it('queries each event bubble with the correct userId and eventId', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    const events = [
      { eventId: 'event-abc', title: 'Event A' },
      { eventId: 'event-xyz', title: 'Event B' },
    ];

    renderWithTheme(<UserProfileMomentsBar {...defaultProps} userId="owner-99" events={events} />);

    const calls = mockUseQuery.mock.calls as Array<[unknown, { variables: { userId: string; eventId: string } }]>;
    const variablesList = calls.map((c) => c[1].variables);

    expect(variablesList).toContainEqual({ userId: 'owner-99', eventId: 'event-abc' });
    expect(variablesList).toContainEqual({ userId: 'owner-99', eventId: 'event-xyz' });
  });

  it('renders initials for an author without a profile picture', () => {
    mockUseQuery.mockReturnValue({
      data: { readUserEventMoments: [makeMoment()] },
      loading: false,
    });

    renderWithTheme(<UserProfileMomentsBar {...defaultProps} events={[{ eventId: 'event-1', title: 'Test Event' }]} />);

    // Author given_name is 'Test', so initials should be 'T'
    expect(screen.getByText('T')).toBeTruthy();
  });
});
