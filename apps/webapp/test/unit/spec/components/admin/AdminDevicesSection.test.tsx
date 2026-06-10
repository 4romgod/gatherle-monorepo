import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminDevicesSection from '@/components/admin/AdminDevicesSection';

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockSetToastProps = jest.fn();
const mockUpdateStatus = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
}));

jest.mock('@/hooks/useAppContext', () => ({
  useAppContext: () => ({ setToastProps: mockSetToastProps }),
}));

jest.mock('@/components/admin/admin-ui', () => ({
  ADMIN_SURFACE_SX: {},
  AdminEmptyState: ({ title, description }: { title: string; description: string }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  AdminListSearchField: ({
    value,
    onChange,
    helperText,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    helperText?: string;
    placeholder?: string;
  }) => (
    <div>
      <label htmlFor="device-search">Device search</label>
      <input
        id="device-search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {helperText ? <span>{helperText}</span> : null}
    </div>
  ),
  AdminSectionHeader: ({
    title,
    description,
    meta,
  }: {
    title: string;
    description: string;
    meta?: React.ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {meta}
    </div>
  ),
}));

describe('AdminDevicesSection', () => {
  const buildDevice = () => ({
    mobileDeviceAccessId: 'mobile-device-access-1',
    deviceInstallationId: 'device-installation-1',
    platform: 'Android',
    status: 'Pending',
    appVersion: '1.0.0',
    buildVersion: '100',
    firstSeenAt: '2026-06-10T07:00:00.000Z',
    lastSeenAt: '2026-06-10T08:00:00.000Z',
    seenUserIds: ['user-1', 'user-2', 'user-3'],
    lastSeenUserId: 'user-1',
    lastAuthenticatedAt: '2026-06-10T08:15:00.000Z',
    lastSeenUser: {
      userId: 'user-1',
      username: 'gatherle-admin',
      given_name: 'Gatherle',
      family_name: 'Admin',
      email: 'admin@gatherle.com',
    },
    seenUsers: [
      {
        userId: 'user-1',
        username: 'gatherle-admin',
        given_name: 'Gatherle',
        family_name: 'Admin',
        email: 'admin@gatherle.com',
      },
      {
        userId: 'user-2',
        username: 'event-host',
        given_name: 'Event',
        family_name: 'Host',
        email: 'host@gatherle.com',
      },
      {
        userId: 'user-3',
        username: 'extra-user',
        given_name: 'Extra',
        family_name: 'User',
        email: 'extra@gatherle.com',
      },
    ],
    reviewedAt: '2026-06-10T08:30:00.000Z',
    reviewedByUserId: 'admin-1',
    createdAt: '2026-06-10T07:00:00.000Z',
    updatedAt: '2026-06-10T08:30:00.000Z',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue({ data: { readMobileDeviceAccesses: [buildDevice()] } });
    mockUpdateStatus.mockResolvedValue({
      data: {
        updateMobileDeviceAccessStatus: {
          mobileDeviceAccessId: 'mobile-device-access-1',
        },
      },
    });
    mockUseMutation.mockReturnValue([mockUpdateStatus, { loading: false }]);
    mockUseQuery.mockReturnValue({
      data: {
        readMobileDeviceAccesses: [buildDevice()],
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  function readLastToastMessage() {
    const updater = mockSetToastProps.mock.calls.at(-1)?.[0] as
      | ((prev: Record<string, unknown>) => Record<string, unknown>)
      | undefined;

    if (!updater) {
      return null;
    }

    return updater({}).message;
  }

  it('renders linked user context and installation metadata', () => {
    render(<AdminDevicesSection token="token" />);

    expect(screen.getByText('Device access')).toBeTruthy();
    expect(screen.getByText('device-installation-1')).toBeTruthy();
    expect(screen.getByText('Last user · Gatherle Admin')).toBeTruthy();
    expect(screen.getByText(/Linked users: Gatherle Admin, Event Host \+1 more/)).toBeTruthy();
  });

  it('updates a device status and refreshes the list', async () => {
    render(<AdminDevicesSection token="token" />);

    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith({
        variables: {
          input: {
            deviceInstallationId: 'device-installation-1',
            status: 'Approved',
          },
        },
      });
    });
    expect(mockRefetch).toHaveBeenCalled();
    expect(readLastToastMessage()).toBe('Device moved to approved.');
  });

  it('adds the status filter to the query variables after the queue chip is selected', async () => {
    jest.useFakeTimers();

    render(<AdminDevicesSection token="token" />);

    fireEvent.click(screen.getByText('Blocked'));

    await waitFor(() => {
      expect(mockUseQuery.mock.calls.at(-1)?.[1]).toEqual(
        expect.objectContaining({
          variables: {
            input: {
              status: 'Blocked',
            },
          },
        }),
      );
    });

    fireEvent.change(screen.getByLabelText('Device search'), { target: { value: 'build 100' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockUseQuery.mock.calls.at(-1)?.[1]).toEqual(
        expect.objectContaining({
          variables: {
            input: {
              search: 'build 100',
              status: 'Blocked',
            },
          },
        }),
      );
    });

    jest.useRealTimers();
  });
});
