import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { MobileDeviceAccessProvider, useMobileDeviceAccess } from '@/app/providers/MobileDeviceAccessProvider';
import { MobileDeviceAccessPlatform, MobileDeviceAccessStatus } from '@data/graphql/types/graphql';

const mockApolloClient = {
  mutate: jest.fn(),
};

const mockBuildMobileDeviceAccessRegistrationInput = jest.fn();
const mockGetOrCreateDeviceInstallationId = jest.fn();
const mockStoreMobileDeviceRegistrationSecret = jest.fn().mockResolvedValue(undefined);

jest.mock('@apollo/client', () => ({
  useApolloClient: () => mockApolloClient,
}));

jest.mock('@/lib/deviceInstallation', () => ({
  buildMobileDeviceAccessRegistrationInput: (...args: unknown[]) =>
    mockBuildMobileDeviceAccessRegistrationInput(...args),
  getOrCreateDeviceInstallationId: (...args: unknown[]) => mockGetOrCreateDeviceInstallationId(...args),
  storeMobileDeviceRegistrationSecret: (...args: unknown[]) => mockStoreMobileDeviceRegistrationSecret(...args),
}));

function MobileDeviceAccessProbe() {
  const { deviceInstallationId, errorMessage, isApproved, state } = useMobileDeviceAccess();

  return (
    <Text>{`state:${state} approved:${String(isApproved)} device:${deviceInstallationId ?? 'none'} error:${errorMessage ?? 'none'}`}</Text>
  );
}

describe('MobileDeviceAccessProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats pending registrations as allowed so the app stays open by default', async () => {
    mockGetOrCreateDeviceInstallationId.mockResolvedValueOnce('install-1');
    mockBuildMobileDeviceAccessRegistrationInput.mockResolvedValueOnce({
      deviceInstallationId: 'install-1',
      platform: MobileDeviceAccessPlatform.Android,
    });
    mockApolloClient.mutate.mockResolvedValueOnce({
      data: {
        registerMobileDeviceAccess: {
          appVersion: '1.0.0',
          buildVersion: '100',
          deviceInstallationId: 'install-1',
          platform: MobileDeviceAccessPlatform.Android,
          registrationSecret: 'secret-1',
          status: MobileDeviceAccessStatus.Pending,
        },
      },
    });

    render(
      <MobileDeviceAccessProvider>
        <MobileDeviceAccessProbe />
      </MobileDeviceAccessProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('state:approved approved:true device:install-1 error:none')).toBeTruthy();
    });

    expect(mockStoreMobileDeviceRegistrationSecret).toHaveBeenCalledWith('secret-1');
  });

  it('keeps the app open when device registration refresh fails', async () => {
    mockGetOrCreateDeviceInstallationId.mockResolvedValueOnce('install-2');
    mockBuildMobileDeviceAccessRegistrationInput.mockResolvedValueOnce({
      deviceInstallationId: 'install-2',
      platform: MobileDeviceAccessPlatform.Android,
    });
    mockApolloClient.mutate.mockRejectedValueOnce(new Error('network down'));

    render(
      <MobileDeviceAccessProvider>
        <MobileDeviceAccessProbe />
      </MobileDeviceAccessProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('state:approved approved:true device:install-2 error:network down')).toBeTruthy();
    });
  });

  it('still blocks installations that the API marks as blocked', async () => {
    mockGetOrCreateDeviceInstallationId.mockResolvedValueOnce('install-3');
    mockBuildMobileDeviceAccessRegistrationInput.mockResolvedValueOnce({
      deviceInstallationId: 'install-3',
      platform: MobileDeviceAccessPlatform.Android,
    });
    mockApolloClient.mutate.mockResolvedValueOnce({
      data: {
        registerMobileDeviceAccess: {
          appVersion: '1.0.0',
          buildVersion: '100',
          deviceInstallationId: 'install-3',
          platform: MobileDeviceAccessPlatform.Android,
          registrationSecret: 'secret-3',
          status: MobileDeviceAccessStatus.Blocked,
        },
      },
    });

    render(
      <MobileDeviceAccessProvider>
        <MobileDeviceAccessProbe />
      </MobileDeviceAccessProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('state:blocked approved:false device:install-3 error:none')).toBeTruthy();
    });
  });
});
