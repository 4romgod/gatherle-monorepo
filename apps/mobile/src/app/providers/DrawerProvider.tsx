import { PropsWithChildren, createContext, useContext, useState } from 'react';

type DrawerContextValue = {
  closeDrawer: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  toggleDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: PropsWithChildren) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
  const toggleDrawer = () => setDrawerOpen((current) => !current);

  return (
    <DrawerContext.Provider
      value={{
        closeDrawer,
        drawerOpen,
        openDrawer,
        toggleDrawer,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawerState() {
  const context = useContext(DrawerContext);

  if (!context) {
    throw new Error('useDrawerState must be used inside DrawerProvider.');
  }

  return context;
}
