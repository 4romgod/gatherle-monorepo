import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MainTabToolbar } from './MainTabToolbar';

type MainTabScreenLayoutProps = {
  children: ReactNode;
  showToolbar?: boolean;
  toolbar?: ReactNode;
};

export function MainTabScreenLayout({ children, showToolbar = true, toolbar }: MainTabScreenLayoutProps) {
  const { theme } = useAppTheme();
  const resolvedToolbar = showToolbar ? toolbar === undefined ? <MainTabToolbar /> : toolbar : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {resolvedToolbar}
      <View style={styles.content}>{children}</View>
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
