import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FollowedMomentsBar from '@/components/eventMoments/FollowedMomentsBar';

const mockUseSession = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@/data/graphql/query', () => ({
  ReadFollowedMomentsDocument: {},
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

/** Minimal theme that includes the custom hero.gradient palette extension. */
const testTheme = createTheme({
  palette: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function makeMoment(authorId: string, overrides: Record<string, unknown> = {}) {
  return {
    momentId: `moment-${authorId}-${Math.random().toString(36).slice(2)}`,
    eventId: 'event-1',
    authorId,
    type: 'Image',
    state: 'READY',
    caption: 'Test caption',
    mediaUrl: 'https://cdn.example.com/img.jpg',
    thumbnailUrl: null,
    background: null,
    durationSeconds: null,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    author: {
      userId: authorId,
      username: `user_${authorId}`,
      given_name: `Name_${authorId}`,
      family_name: 'Test',
      profile_picture: null,
    },
    ...overrides,
  };
}

describe('FollowedMomentsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: { user: { token: 'mock-token' } } });
  });

  it('renders 6 skeleton bubbles while loading with no moments', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    const { container } = renderWithTheme(<FollowedMomentsBar />);

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    // 6 bubbles × 2 skeletons each (circle + text label) = 12
    expect(skeletons.length).toBe(12);
  });

  it('renders nothing when loading is done and no moments are available', () => {
    mockUseQuery.mockReturnValue({
      data: { readFollowedMoments: { items: [], nextCursor: null, hasMore: false } },
      loading: false,
    });

    const { container } = renderWithTheme(<FollowedMomentsBar />);

    expect(container.firstChild).toBeNull();
  });

  it('renders one bubble per unique author when there are ready moments', () => {
    const moments = [
      makeMoment('author-1'),
      makeMoment('author-1'), // duplicate author → single bubble
      makeMoment('author-2'),
    ];
    mockUseQuery.mockReturnValue({
      data: { readFollowedMoments: { items: moments, nextCursor: null, hasMore: false } },
      loading: false,
    });

    renderWithTheme(<FollowedMomentsBar />);

    // Each bubble shows the author's given_name as the label
    expect(screen.getByText('Name_author-1')).toBeTruthy();
    expect(screen.getByText('Name_author-2')).toBeTruthy();
  });

  it('filters out non-READY moments and renders nothing when none remain', () => {
    const moments = [makeMoment('author-1', { state: 'PROCESSING' }), makeMoment('author-2', { state: 'PENDING' })];
    mockUseQuery.mockReturnValue({
      data: { readFollowedMoments: { items: moments, nextCursor: null, hasMore: false } },
      loading: false,
    });

    const { container } = renderWithTheme(<FollowedMomentsBar />);

    expect(container.firstChild).toBeNull();
  });

  it('filters out non-READY moments and only shows authors with READY moments', () => {
    const moments = [makeMoment('author-1', { state: 'PROCESSING' }), makeMoment('author-2', { state: 'READY' })];
    mockUseQuery.mockReturnValue({
      data: { readFollowedMoments: { items: moments, nextCursor: null, hasMore: false } },
      loading: false,
    });

    renderWithTheme(<FollowedMomentsBar />);

    expect(screen.getByText('Name_author-2')).toBeTruthy();
    expect(screen.queryByText('Name_author-1')).toBeNull();
  });

  it('passes skip: true to useQuery when there is no auth token', () => {
    mockUseSession.mockReturnValue({ data: null });
    mockUseQuery.mockReturnValue({ data: undefined, loading: false });

    renderWithTheme(<FollowedMomentsBar />);

    const queryOptions = mockUseQuery.mock.calls[0]?.[1] as { skip?: boolean } | undefined;
    expect(queryOptions?.skip).toBe(true);
  });

  it('passes limit: 100 to the query variables', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false });

    renderWithTheme(<FollowedMomentsBar />);

    const queryOptions = mockUseQuery.mock.calls[0]?.[1] as { variables?: { limit: number } } | undefined;
    expect(queryOptions?.variables?.limit).toBe(100);
  });
});
