import { PropsWithChildren, createContext, useContext, useState } from 'react';

type PreviewSessionContextValue = {
  isAuthenticated: boolean;
  previewAuthToken: string | null;
  previewUsername: string | null;
  setAuthenticated: (value: boolean) => void;
  toggleMockAuth: () => void;
};

function normalizeEnvValue(value?: string) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

const PREVIEW_AUTH_TOKEN = normalizeEnvValue(process.env.EXPO_PUBLIC_AUTH_TOKEN);
const PREVIEW_USERNAME = normalizeEnvValue(process.env.EXPO_PUBLIC_PREVIEW_USERNAME);

const PreviewSessionContext = createContext<PreviewSessionContextValue | null>(null);

export function PreviewSessionProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setAuthenticated] = useState(true);

  const toggleMockAuth = () => setAuthenticated((current) => !current);

  return (
    <PreviewSessionContext.Provider
      value={{
        isAuthenticated,
        previewAuthToken: PREVIEW_AUTH_TOKEN,
        previewUsername: PREVIEW_USERNAME,
        setAuthenticated,
        toggleMockAuth,
      }}
    >
      {children}
    </PreviewSessionContext.Provider>
  );
}

export function usePreviewSession() {
  const context = useContext(PreviewSessionContext);

  if (!context) {
    throw new Error('usePreviewSession must be used inside PreviewSessionProvider.');
  }

  return context;
}
