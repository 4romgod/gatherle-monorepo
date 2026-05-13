import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  const { theme } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    gap: 30,
    paddingBottom: 108,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
