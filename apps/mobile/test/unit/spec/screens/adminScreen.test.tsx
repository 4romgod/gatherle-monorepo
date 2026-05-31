import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AdminScreen } from '@/screens/admin/AdminScreen';

const mockNavigate = jest.fn();
const mockUseQuery = jest.fn();
const mockUseAdminAccess = jest.fn();
const mockEventsRefetch = jest.fn();
const mockCategoriesRefetch = jest.fn();
const mockOrganizationsRefetch = jest.fn();
const mockUsersRefetch = jest.fn();
const mockVenuesRefetch = jest.fn();
const mockRefetchAdminAccess = jest.fn();

jest.mock('@data/graphql/query/EventCategory/query', () => ({
  GetEventCategoriesDocument: 'GetEventCategoriesDocument',
}));

jest.mock('@data/graphql/query/Event/query', () => ({
  GetEventsCountDocument: 'GetEventsCountDocument',
}));

jest.mock('@data/graphql/query/Organization/query', () => ({
  GetOrganizationsDocument: 'GetOrganizationsDocument',
}));

jest.mock('@data/graphql/query/User/query', () => ({
  GetUsersDocument: 'GetUsersDocument',
}));

jest.mock('@data/graphql/query/Venue/query', () => ({
  GetVenuesDocument: 'GetVenuesDocument',
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/hooks/admin/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

jest.mock('@/hooks/core/usePullToRefresh', () => ({
  usePullToRefresh: (refreshFn: () => Promise<unknown>) => ({ onRefresh: refreshFn, refreshing: false }),
}));

jest.mock('@/lib/auth', () => ({
  getApolloAuthContext: jest.fn(() => ({})),
}));

jest.mock('@/components/auth/AuthPromptCard', () => ({
  AuthPromptCard: ({
    title,
    description,
    primaryLabel,
    secondaryLabel,
    onPressPrimary,
    onPressSecondary,
  }: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    onPressPrimary?: () => void;
    onPressSecondary?: () => void;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        <ReactNative.Text>{description}</ReactNative.Text>
        <ReactNative.Pressable onPress={onPressPrimary}>
          <ReactNative.Text>{primaryLabel}</ReactNative.Text>
        </ReactNative.Pressable>
        <ReactNative.Pressable onPress={onPressSecondary}>
          <ReactNative.Text>{secondaryLabel}</ReactNative.Text>
        </ReactNative.Pressable>
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/core/PageContainer', () => ({
  PageContainer: ({ children, onRefresh }: React.PropsWithChildren<{ onRefresh?: () => void }>) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        {onRefresh ? (
          <ReactNative.Pressable onPress={onRefresh}>
            <ReactNative.Text>Refresh page</ReactNative.Text>
          </ReactNative.Pressable>
        ) : null}
        {children}
      </ReactNative.View>
    );
  },
}));

jest.mock('@/components/core/SectionHeading', () => ({
  SectionHeading: ({ title }: { title: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{title}</ReactNative.Text>;
  },
}));

jest.mock('@/components/core/StateNotice', () => ({
  StateNotice: ({ message }: { message: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{message}</ReactNative.Text>;
  },
}));

jest.mock('@/components/admin/AdminMetricCard', () => ({
  AdminMetricCard: ({ label, value }: { label: string; value: string | number }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{`${label}:${value}`}</ReactNative.Text>;
  },
}));

jest.mock('@/components/admin/AdminDomainLinkCard', () => ({
  AdminDomainLinkCard: ({
    title,
    description,
    onPress,
  }: {
    title: string;
    description: string;
    onPress: () => void;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.Pressable onPress={onPress}>
        <ReactNative.Text>{`Link:${title}`}</ReactNative.Text>
        <ReactNative.Text>{description}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  },
}));

describe('mobile AdminScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockImplementation((document: string) => {
      switch (document) {
        case 'GetEventsCountDocument':
          return { data: { readEventsCount: 41 }, refetch: mockEventsRefetch };
        case 'GetEventCategoriesDocument':
          return { data: { readEventCategories: [{ id: 'cat-1' }, { id: 'cat-2' }] }, refetch: mockCategoriesRefetch };
        case 'GetOrganizationsDocument':
          return { data: { readOrganizations: [{ id: 'org-1' }] }, refetch: mockOrganizationsRefetch };
        case 'GetUsersDocument':
          return { data: { readUsers: [{ id: 'user-1' }, { id: 'user-2' }] }, refetch: mockUsersRefetch };
        case 'GetVenuesDocument':
          return { data: { readVenues: [{ id: 'venue-1' }] }, refetch: mockVenuesRefetch };
        default:
          return { data: null, refetch: jest.fn() };
      }
    });
  });

  it('prompts guests to sign in before accessing admin tools', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: null,
      isAdmin: false,
      isAuthenticated: false,
      loading: false,
      refetch: mockRefetchAdminAccess,
    });

    render(<AdminScreen />);

    expect(screen.getByText('Admin tools require sign-in')).toBeTruthy();
    expect(
      screen.getByText('Sign in with a Gatherle admin account to access platform operations and moderation tools.'),
    ).toBeTruthy();
  });

  it('routes guests to login and registration from the auth prompt', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: null,
      isAdmin: false,
      isAuthenticated: false,
      loading: false,
      refetch: mockRefetchAdminAccess,
    });

    render(<AdminScreen />);

    fireEvent.press(screen.getByText('Login'));
    fireEvent.press(screen.getByText('Create account'));

    expect(mockNavigate).toHaveBeenNthCalledWith(1, 'Login');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, 'Register');
  });

  it('shows the access-checking state while admin permissions are loading', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: false,
      isAuthenticated: true,
      loading: true,
      refetch: mockRefetchAdminAccess,
    });

    render(<AdminScreen />);

    expect(screen.getByText('Checking your admin access...')).toBeTruthy();
  });

  it('renders the admin hub with overview metrics and domain links for admins', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      refetch: mockRefetchAdminAccess,
    });

    render(<AdminScreen />);

    expect(screen.getByText('Operations overview')).toBeTruthy();
    expect(screen.getByText('Manage domains')).toBeTruthy();
    expect(screen.getByText('Events:41')).toBeTruthy();
    expect(screen.getByText('Categories:2')).toBeTruthy();
    expect(screen.getByText('Organizations:1')).toBeTruthy();
    expect(screen.getByText('Users:2')).toBeTruthy();
    expect(screen.getByText('Venues:1')).toBeTruthy();
    expect(screen.getByText('Link:Events')).toBeTruthy();
    expect(screen.getByText('Link:Organizations')).toBeTruthy();
    expect(screen.getByText('Link:Venues')).toBeTruthy();
    expect(screen.getByText('Link:Users')).toBeTruthy();
    expect(screen.getByText('Link:Categories')).toBeTruthy();
    expect(screen.getByText('Link:Groups')).toBeTruthy();
  });

  it('navigates to a domain stack screen when a hub link is pressed', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      refetch: mockRefetchAdminAccess,
    });

    render(<AdminScreen />);

    fireEvent.press(screen.getByText('Link:Events'));
    fireEvent.press(screen.getByText('Link:Categories'));

    expect(mockNavigate).toHaveBeenNthCalledWith(1, 'AdminEvents');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, 'AdminCategories');
  });

  it('shows the non-admin state when the user lacks admin access', () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: false,
      isAuthenticated: true,
      loading: false,
      refetch: mockRefetchAdminAccess,
    });

    render(<AdminScreen />);

    expect(screen.getByText('Only Gatherle admins can access this portal.')).toBeTruthy();
  });

  it('refreshes overview metrics and admin access from pull-to-refresh', async () => {
    mockUseAdminAccess.mockReturnValue({
      authToken: 'token',
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      refetch: mockRefetchAdminAccess,
    });

    render(<AdminScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Refresh page'));
    });

    await waitFor(() => {
      expect(mockRefetchAdminAccess).toHaveBeenCalled();
      expect(mockEventsRefetch).toHaveBeenCalled();
      expect(mockCategoriesRefetch).toHaveBeenCalled();
      expect(mockOrganizationsRefetch).toHaveBeenCalled();
      expect(mockUsersRefetch).toHaveBeenCalled();
      expect(mockVenuesRefetch).toHaveBeenCalled();
    });
  });
});
