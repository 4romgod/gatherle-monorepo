import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import ProfileEventsTabs from '@/components/users/ProfileEventsTabs';

jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');

  return {
    ...actual,
    Tooltip: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
      <div data-testid="tooltip" data-title={String(title)}>
        {children}
      </div>
    ),
  };
});

jest.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: jest.fn(() => null),
}));

jest.mock('@/components/users/ProfileEventTile', () => ({
  __esModule: true,
  default: ({ event }: { event: { title: string } }) => <div>{event.title}</div>,
}));

describe('ProfileEventsTabs', () => {
  it('uses viewer-correct tooltip copy on another user profile', () => {
    render(
      <ProfileEventsTabs upcomingRsvpdEvents={[]} pastRsvpdEvents={[]} organizedEvents={[]} isOwnProfile={false} />,
    );

    const tooltipTitles = screen.getAllByTestId('tooltip').map((node) => node.getAttribute('data-title'));

    expect(tooltipTitles).toContain("Going — events they've RSVPed to");
    expect(tooltipTitles).toContain('Attended — past events they went to');
    expect(tooltipTitles).toContain("Hosted — events they've created or co-hosted");
  });

  it('renders hosted-event search controls on the hosted tab for your own account', () => {
    render(
      <ProfileEventsTabs
        initialTabKey="hosted"
        hostedEventsSearchTerm=""
        hostedEventsTotalCount={4}
        onHostedEventsSearchChange={jest.fn()}
        upcomingRsvpdEvents={[]}
        pastRsvpdEvents={[]}
        organizedEvents={[]}
        isOwnProfile
      />,
    );

    expect(screen.getByPlaceholderText(/search hosted events/i)).toBeTruthy();
    expect(screen.getByText('0 of 4 hosted events')).toBeTruthy();
  });
});
