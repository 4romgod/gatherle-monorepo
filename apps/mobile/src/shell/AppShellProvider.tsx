import { PropsWithChildren, createContext, useContext, useState } from 'react';

export type MockUser = {
  avatarUrl?: string;
  email: string;
  initials: string;
  name: string;
};

type AppShellContextValue = {
  closeDrawer: () => void;
  drawerOpen: boolean;
  isAuthenticated: boolean;
  mockUser: MockUser;
  openDrawer: () => void;
  setAuthenticated: (value: boolean) => void;
  toggleDrawer: () => void;
  toggleMockAuth: () => void;
};

const MOCK_USER: MockUser = {
  avatarUrl: 'https://i.pravatar.cc/120?u=jeff@amazon.com',
  email: 'jeff@amazon.com',
  initials: 'JB',
  name: 'Jeff Bezos',
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: PropsWithChildren) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(true);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
  const toggleDrawer = () => setDrawerOpen((current) => !current);
  const toggleMockAuth = () => setAuthenticated((current) => !current);

  return (
    <AppShellContext.Provider
      value={{
        closeDrawer,
        drawerOpen,
        isAuthenticated,
        mockUser: MOCK_USER,
        openDrawer,
        setAuthenticated,
        toggleDrawer,
        toggleMockAuth,
      }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error('useAppShell must be used inside AppShellProvider.');
  }

  return context;
}
