import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

type PageContainerProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function PageContainer({ children, contentContainerStyle, onRefresh, refreshing = false }: PageContainerProps) {
  const { theme } = useAppTheme();

  return (
    <ScrollView
      alwaysBounceVertical
      bounces
      contentContainerStyle={[styles.pageContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      overScrollMode="always"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={onRefresh}
            progressBackgroundColor={theme.colors.surfaceRaised}
            refreshing={refreshing}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    flexGrow: 1,
    gap: 30,
    paddingBottom: 108,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
