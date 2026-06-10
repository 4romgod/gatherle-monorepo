import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { PreviewSessionProvider, usePreviewSession } from '@/app/providers/PreviewSessionProvider';

const mockApolloClient = {
  clearStore: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
};

const mockReadStoredSession = jest.fn();
const mockClearStoredSession = jest.fn().mockResolvedValue(undefined);
const mockWriteStoredSession = jest.fn().mockResolvedValue(undefined);
const mockValidateStoredSession = jest.fn();
const mockClearMobileGoogleSignInSession = jest.fn().mockResolvedValue(undefined);

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

jest.mock('@/lib/auth/googleSignIn', () => ({
  clearMobileGoogleSignInSession: (...args: unknown[]) => mockClearMobileGoogleSignInSession(...args),
}));

function PreviewSessionProbe() {
  const { blockedSessionMessage, isAuthenticated, isSessionReady } = usePreviewSession();
  return (
    <Text>{`ready:${String(isSessionReady)} auth:${String(isAuthenticated)} blocked:${blockedSessionMessage ?? 'none'}`}</Text>
  );
}

function PreviewSessionControls() {
  const { isAuthenticated, isSessionReady, signIn, signOut } = usePreviewSession();

  return (
    <>
      <Text>{`ready:${String(isSessionReady)} auth:${String(isAuthenticated)}`}</Text>
      <Pressable
        onPress={() =>
          signIn({
            email: 'person@example.com',
            token: 'token-123',
            userId: 'user-123',
            username: 'person',
          } as any)
        }
      >
        <Text>login</Text>
      </Pressable>
      <Pressable onPress={signOut}>
        <Text>logout</Text>
      </Pressable>
    </>
  );
}

describe('PreviewSessionProvider', () => {
  beforeEach(() => {
    mockApolloClient.clearStore.mockClear();
    mockApolloClient.query.mockClear();
    mockClearStoredSession.mockClear();
    mockReadStoredSession.mockReset();
    mockValidateStoredSession.mockReset();
    mockWriteStoredSession.mockClear();
    mockClearMobileGoogleSignInSession.mockClear();
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
        expect(screen.getByText('ready:true auth:false blocked:none')).toBeTruthy();
      });

      expect(mockValidateStoredSession).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[PreviewSessionProvider] Failed to read stored session', expect.any(Error));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('clears the native Google session when the user logs out', async () => {
    mockReadStoredSession.mockResolvedValueOnce(null);

    render(
      <PreviewSessionProvider>
        <PreviewSessionControls />
      </PreviewSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('ready:true auth:false')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('login'));

    await waitFor(() => {
      expect(screen.getByText('ready:true auth:true')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('logout'));

    await waitFor(() => {
      expect(screen.getByText('ready:true auth:false')).toBeTruthy();
    });

    expect(mockClearMobileGoogleSignInSession).toHaveBeenCalledTimes(1);
  });

  it('clears a blocked restored session and exposes the block message', async () => {
    mockReadStoredSession.mockResolvedValueOnce({
      email: 'person@example.com',
      token: 'token-123',
      userId: 'user-123',
      username: 'person',
    });
    mockValidateStoredSession.mockResolvedValueOnce({
      kind: 'blocked',
      message: 'Blocked by admin',
    });

    render(
      <PreviewSessionProvider>
        <PreviewSessionProbe />
      </PreviewSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('ready:true auth:false blocked:Blocked by admin')).toBeTruthy();
    });

    expect(mockClearStoredSession).toHaveBeenCalledTimes(1);
    expect(mockApolloClient.clearStore).toHaveBeenCalledTimes(1);
  });
});
