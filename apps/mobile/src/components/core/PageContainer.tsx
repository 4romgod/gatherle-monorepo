import { useApolloClient } from '@apollo/client';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAvoidingView, Platform, RefreshControl, StyleSheet } from 'react-native';
import { MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET } from '@/lib/constants/layout';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

type PageContainerProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  disablePullToRefresh?: boolean;
  onRefresh?: () => void;
  onContentSizeChange?: ComponentProps<typeof KeyboardAwareScrollView>['onContentSizeChange'];
  onScroll?: ComponentProps<typeof KeyboardAwareScrollView>['onScroll'];
  refreshing?: boolean;
  scrollEventThrottle?: ComponentProps<typeof KeyboardAwareScrollView>['scrollEventThrottle'];
};

export function PageContainer({
  children,
  contentContainerStyle,
  disablePullToRefresh = false,
  onContentSizeChange,
  onRefresh,
  onScroll,
  refreshing = false,
  scrollEventThrottle,
}: PageContainerProps) {
  const apolloClient = useApolloClient();
  const { theme } = useAppTheme();
  const [fallbackRefreshing, setFallbackRefreshing] = useState(false);
  const fallbackRefreshingRef = useRef(false);
  const resolvedRefreshing = onRefresh ? refreshing : fallbackRefreshing;
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }

    if (fallbackRefreshingRef.current) {
      return;
    }

    fallbackRefreshingRef.current = true;
    setFallbackRefreshing(true);

    try {
      await apolloClient.reFetchObservableQueries();
    } finally {
      fallbackRefreshingRef.current = false;
      setFallbackRefreshing(false);
    }
  }, [apolloClient, onRefresh]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET : 0}
      style={styles.keyboardShell}
    >
      <KeyboardAwareScrollView
        automaticallyAdjustKeyboardInsets
        alwaysBounceVertical
        bounces
        contentContainerStyle={[styles.pageContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        overScrollMode="always"
        refreshControl={
          !disablePullToRefresh ? (
            <RefreshControl
              colors={[theme.colors.primary]}
              onRefresh={() => {
                void handleRefresh();
              }}
              progressBackgroundColor={theme.colors.surfaceRaised}
              refreshing={resolvedRefreshing}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.colors.background }}
      >
        {children}
      </KeyboardAwareScrollView>
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
