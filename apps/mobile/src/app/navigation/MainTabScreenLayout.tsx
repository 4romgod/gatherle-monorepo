import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MainTabToolbar, type MainTabToolbarProps } from './MainTabToolbar';

type MainTabScreenLayoutProps = {
  children: ReactNode;
  overlay?: ReactNode;
  showToolbar?: boolean;
  toolbar?: ReactNode;
  toolbarProps?: MainTabToolbarProps;
};

export function MainTabScreenLayout({
  children,
  overlay,
  showToolbar = true,
  toolbar,
  toolbarProps,
}: MainTabScreenLayoutProps) {
  const { theme } = useAppTheme();
  const resolvedToolbar = showToolbar ? toolbar === undefined ? <MainTabToolbar {...toolbarProps} /> : toolbar : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {resolvedToolbar}
      <View style={styles.content}>{children}</View>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});
