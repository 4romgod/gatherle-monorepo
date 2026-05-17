import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET } from '@/lib/constants/layout';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET : 0}
      style={styles.keyboardShell}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        alwaysBounceVertical
        bounces
        contentContainerStyle={[styles.pageContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardShell: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
    gap: 30,
    paddingBottom: 108,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
