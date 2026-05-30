import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { PreviewSessionProvider, usePreviewSession } from './PreviewSessionProvider';
import { DrawerProvider, useDrawerState } from './DrawerProvider';
import { MOBILE_BOTTOM_TAB_BAR_HEIGHT } from '@/lib/constants/layout';

type AppLayoutContextValue = {
  bottomTabBarHeight: number;
  mainTabsViewportHeight: number;
  setBottomTabBarHeight: (height: number) => void;
  setMainTabsViewportHeight: (height: number) => void;
};

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function AppShellProvider({ children }: PropsWithChildren) {
  const [bottomTabBarHeight, setBottomTabBarHeight] = useState(MOBILE_BOTTOM_TAB_BAR_HEIGHT);
  const [mainTabsViewportHeight, setMainTabsViewportHeight] = useState(0);
  const layoutValue = useMemo(
    () => ({
      bottomTabBarHeight,
      mainTabsViewportHeight,
      setBottomTabBarHeight,
      setMainTabsViewportHeight,
    }),
    [bottomTabBarHeight, mainTabsViewportHeight],
  );

  return (
    <DrawerProvider>
      <PreviewSessionProvider>
        <AppLayoutContext.Provider value={layoutValue}>{children}</AppLayoutContext.Provider>
      </PreviewSessionProvider>
    </DrawerProvider>
  );
}

export function useAppShell() {
  const layoutContext = useContext(AppLayoutContext);

  if (!layoutContext) {
    throw new Error('useAppShell must be used inside AppShellProvider.');
  }

  return {
    ...useDrawerState(),
    ...usePreviewSession(),
    ...layoutContext,
  };
}
