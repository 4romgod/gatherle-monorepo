import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PreviewSessionProvider, usePreviewSession } from '@/app/providers/PreviewSessionProvider';

const mockApolloClient = {
  clearStore: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
};

const mockReadStoredSession = jest.fn();
const mockClearStoredSession = jest.fn().mockResolvedValue(undefined);
const mockWriteStoredSession = jest.fn().mockResolvedValue(undefined);
const mockValidateStoredSession = jest.fn();

jest.mock('@apollo/client', () => ({
  useApolloClient: () => mockApolloClient,
}));

jest.mock('@/lib/sessionStorage', () => ({
  clearStoredSession: (...args: unknown[]) => mockClearStoredSession(...args),
  readStoredSession: (...args: unknown[]) => mockReadStoredSession(...args),
  writeStoredSession: (...args: unknown[]) => mockWriteStoredSession(...args),
}));

jest.mock('@/lib/auth/sessionValidation', () => ({
  validateStoredSession: (...args: unknown[]) => mockValidateStoredSession(...args),
}));

function PreviewSessionProbe() {
  const { isAuthenticated, isSessionReady } = usePreviewSession();
  return <Text>{`ready:${String(isSessionReady)} auth:${String(isAuthenticated)}`}</Text>;
}

describe('PreviewSessionProvider', () => {
  beforeEach(() => {
    mockApolloClient.clearStore.mockClear();
    mockApolloClient.query.mockClear();
    mockClearStoredSession.mockClear();
    mockReadStoredSession.mockReset();
    mockValidateStoredSession.mockReset();
    mockWriteStoredSession.mockClear();
  });

  it('treats stored-session read failures as an empty session instead of getting stuck', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockReadStoredSession.mockRejectedValueOnce(new Error('SecureStore unavailable'));

    try {
      render(
        <PreviewSessionProvider>
          <PreviewSessionProbe />
        </PreviewSessionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('ready:true auth:false')).toBeTruthy();
      });

      expect(mockValidateStoredSession).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[PreviewSessionProvider] Failed to read stored session', expect.any(Error));
    } finally {
      warnSpy.mockRestore();
    }
  });
});
