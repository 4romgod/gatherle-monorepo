import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { CommunityMemberRow } from '@/components/community/CommunityMemberRow';
import { FilterActionButton } from '@/components/core/FilterActionButton';
import { FilterChip } from '@/components/core/FilterChip';
import { SmallActionButton } from '@/components/core/SmallActionButton';
import { VenueListItem } from '@/components/venues/VenueListItem';
import type { MobileDirectoryUser } from '@data/graphql/query/User/types';
import type { MobileVenue } from '@data/graphql/query/Venue/types';

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        border: '#d9dee7',
        primary: '#5850ec',
        primaryContrast: '#ffffff',
        primarySoft: '#ede9fe',
        success: '#12b76a',
        successSoft: '#dcfae6',
        surface: '#ffffff',
        surfaceMuted: '#f8fafc',
        surfaceRaised: '#ffffff',
        textMuted: '#98a2b3',
        textPrimary: '#0b1736',
        textSecondary: '#667085',
      },
    },
  }),
}));

const directoryUser = {
  bio: 'Trail runner and live music fan',
  family_name: 'Baur',
  given_name: 'Jack',
  location: { city: 'Cape Town', country: 'South Africa', state: 'Western Cape' },
  profile_picture: null,
  userId: 'user-1',
  username: 'jackBaur',
} as MobileDirectoryUser;

const venue = {
  address: { city: 'Johannesburg', country: 'South Africa', region: 'Gauteng' },
  capacity: 400,
  featuredImageUrl: null,
  name: 'Signal Loft',
  type: 'Physical',
  venueId: 'venue-1',
} as MobileVenue;

describe('mobile shared components', () => {
  it('handles filter chip press and nested remove press separately', () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    render(
      <>
        <FilterChip active label="Near me" onPress={onPress} onRemove={onRemove} small tone="success" />
        <FilterChip active={false} label="Category" onPress={onPress} onRemove={onRemove} />
      </>,
    );

    const stopPropagation = jest.fn();
    fireEvent.press(screen.getByText('Near me'));
    fireEvent.press(screen.getAllByText('x')[0], { stopPropagation });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('renders inactive primary filter chips without a remove action', () => {
    const onPress = jest.fn();
    render(
      <>
        <FilterChip label="Music" onPress={onPress} />
        <FilterChip active small label="Art" onPress={onPress} />
      </>,
    );

    expect(screen.getByText('Music')).toBeTruthy();
    expect(screen.queryByText('x')).toBeNull();

    fireEvent.press(screen.getByText('Music'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders filter action badge only when filters are active', () => {
    const onPress = jest.fn();
    const { rerender } = render(<FilterActionButton activeCount={2} onPress={onPress} />);

    expect(screen.getByText('Filters')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    fireEvent.press(screen.getByText('Filters'));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<FilterActionButton activeCount={0} onPress={onPress} />);
    expect(screen.queryByText('2')).toBeNull();
  });

  it('renders compact action and choice chips and calls their handlers', () => {
    const onAction = jest.fn();
    const onChoice = jest.fn();
    render(
      <>
        <SmallActionButton compact icon="plus" label="Create" onPress={onAction} tone="outline" />
        <SmallActionButton icon="edit-2" label="Edit" onPress={onAction} />
        <AccountChoiceChip label="Admin" onPress={onChoice} selected />
        <AccountChoiceChip label="Host" onPress={onChoice} selected={false} />
      </>,
    );

    fireEvent.press(screen.getByText('Create'));
    fireEvent.press(screen.getByText('Edit'));
    fireEvent.press(screen.getByText('Admin'));
    fireEvent.press(screen.getByText('Host'));

    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onChoice).toHaveBeenCalledTimes(2);
    expect(screen.getByText('plus')).toBeTruthy();
    expect(screen.getByText('edit-2')).toBeTruthy();
  });

  it('renders community members with fallback avatar and optional primary action', () => {
    const onPress = jest.fn();
    const onMessage = jest.fn();
    render(
      <CommunityMemberRow
        onPress={onPress}
        onPressPrimaryAction={onMessage}
        primaryActionLabel="Message"
        user={directoryUser}
      />,
    );

    expect(screen.getByText('Jack Baur')).toBeTruthy();
    expect(screen.getByText('@jackBaur')).toBeTruthy();
    expect(screen.getByText('Trail runner and live music fan')).toBeTruthy();
    expect(screen.getByText('JB')).toBeTruthy();

    fireEvent.press(screen.getByText('Jack Baur'));
    fireEvent.press(screen.getByText('Message'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('renders community rows with profile images and without an action', () => {
    render(<CommunityMemberRow user={{ ...directoryUser, profile_picture: 'https://example.com/avatar.png' }} />);

    expect(screen.getByText('Jack Baur')).toBeTruthy();
    expect(screen.queryByText('JB')).toBeNull();
    expect(screen.queryByText('Message')).toBeNull();
  });

  it('renders venue rows with fallback image, capacity, and location', () => {
    const onPress = jest.fn();
    render(<VenueListItem onPress={onPress} venue={venue} />);

    expect(screen.getByText('Signal Loft')).toBeTruthy();
    expect(screen.getByText('Physical')).toBeTruthy();
    expect(screen.getByText('400 cap')).toBeTruthy();
    expect(screen.getByText('Johannesburg, Gauteng, South Africa')).toBeTruthy();
    expect(screen.getByText('map-pin')).toBeTruthy();

    fireEvent.press(screen.getByText('Signal Loft'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders venue rows with featured images and without capacity', () => {
    render(<VenueListItem venue={{ ...venue, capacity: null, featuredImageUrl: 'https://example.com/venue.png' }} />);

    expect(screen.getByText('Signal Loft')).toBeTruthy();
    expect(screen.queryByText('400 cap')).toBeNull();
    expect(screen.queryByText('map-pin')).toBeNull();
  });

  it('falls back when community and venue metadata is sparse', () => {
    render(
      <>
        <CommunityMemberRow
          user={{
            ...directoryUser,
            bio: null,
            family_name: '',
            given_name: '',
            location: null,
          }}
        />
        <VenueListItem venue={{ ...venue, address: null, capacity: null }} />
      </>,
    );

    expect(screen.getByText('jackBaur')).toBeTruthy();
    expect(screen.getByText('Gatherle community member')).toBeTruthy();
    expect(screen.getByText('Address details coming soon')).toBeTruthy();
  });
});
