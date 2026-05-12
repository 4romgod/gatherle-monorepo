import { PropsWithChildren } from 'react';
import { PreviewSessionProvider, usePreviewSession } from '@/features/session/providers/PreviewSessionProvider';
import { DrawerProvider, useDrawerState } from './DrawerProvider';

export function AppShellProvider({ children }: PropsWithChildren) {
  return (
    <DrawerProvider>
      <PreviewSessionProvider>{children}</PreviewSessionProvider>
    </DrawerProvider>
  );
}

export function useAppShell() {
  return {
    ...useDrawerState(),
    ...usePreviewSession(),
  };
}
