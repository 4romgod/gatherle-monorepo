import { Feather } from '@expo/vector-icons';
import {
  PropsWithChildren,
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppShell } from './AppShellProvider';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type AppToastTone = 'error' | 'info' | 'success';

type AppToastInput = {
  durationMs?: number;
  message: string;
  title?: string;
  tone?: AppToastTone;
};

type AppFeedbackContextValue = {
  hideBlockingLoader: () => void;
  hideToast: () => void;
  showBlockingLoader: (message?: string) => void;
  showToast: (input: AppToastInput) => void;
  withBlockingLoader: <T>(message: string | undefined, task: () => Promise<T>) => Promise<T>;
};

type AppToastState = Required<Pick<AppToastInput, 'durationMs' | 'message' | 'tone'>> &
  Pick<AppToastInput, 'title'> & {
    id: number;
  };

type FeatherIconName = ComponentProps<typeof Feather>['name'];

const DEFAULT_TOAST_DURATION_MS = 3200;

const AppFeedbackContext = createContext<AppFeedbackContextValue | null>(null);

export function AppFeedbackProvider({ children }: PropsWithChildren) {
  const { bottomTabBarHeight } = useAppShell();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [loaderCount, setLoaderCount] = useState(0);
  const [loaderMessage, setLoaderMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<AppToastState | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(18)).current;
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nextToastIdRef = useRef(1);

  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(toastOpacity, {
        duration: 180,
        easing: Easing.out(Easing.ease),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        duration: 180,
        easing: Easing.out(Easing.ease),
        toValue: 18,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [toastOpacity, toastTranslateY]);

  const showToast = useCallback(
    ({ durationMs = DEFAULT_TOAST_DURATION_MS, message, title, tone = 'info' }: AppToastInput) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      setToast({
        durationMs,
        id: nextToastIdRef.current++,
        message,
        title,
        tone,
      });
    },
    [],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    toastOpacity.setValue(0);
    toastTranslateY.setValue(18);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        duration: 220,
        easing: Easing.out(Easing.ease),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslateY, {
        damping: 18,
        mass: 0.9,
        stiffness: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimeoutRef.current = setTimeout(() => {
      hideToast();
    }, toast.durationMs);

    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, [hideToast, toast, toastOpacity, toastTranslateY]);

  const showBlockingLoader = useCallback((message?: string) => {
    setLoaderCount((current) => current + 1);
    if (message) {
      setLoaderMessage(message);
    }
  }, []);

  const hideBlockingLoader = useCallback(() => {
    setLoaderCount((current) => {
      const nextCount = Math.max(0, current - 1);
      if (nextCount === 0) {
        setLoaderMessage(null);
      }
      return nextCount;
    });
  }, []);

  const withBlockingLoader = useCallback(
    async <T,>(message: string | undefined, task: () => Promise<T>) => {
      showBlockingLoader(message);
      try {
        return await task();
      } finally {
        hideBlockingLoader();
      }
    },
    [hideBlockingLoader, showBlockingLoader],
  );

  const contextValue = useMemo<AppFeedbackContextValue>(
    () => ({
      hideBlockingLoader,
      hideToast,
      showBlockingLoader,
      showToast,
      withBlockingLoader,
    }),
    [hideBlockingLoader, hideToast, showBlockingLoader, showToast, withBlockingLoader],
  );

  const toastPalette =
    toast?.tone === 'success'
      ? {
          accent: theme.colors.success,
          icon: 'check-circle' as FeatherIconName,
          surface: theme.colors.successSoft,
        }
      : toast?.tone === 'error'
        ? {
            accent: theme.colors.error,
            icon: 'alert-circle' as FeatherIconName,
            surface: theme.colors.errorSoft,
          }
        : {
            accent: theme.colors.primary,
            icon: 'info' as FeatherIconName,
            surface: theme.colors.surfaceRaised,
          };

  return (
    <AppFeedbackContext.Provider value={contextValue}>
      {children}

      {loaderCount > 0 ? (
        <View pointerEvents="auto" style={styles.loaderOverlay}>
          <View
            style={[
              styles.loaderCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={[styles.loaderTitle, { color: theme.colors.textPrimary }]}>Please wait</Text>
            <Text style={[styles.loaderMessage, { color: theme.colors.textSecondary }]}>
              {loaderMessage ?? 'We’re wrapping this up for you.'}
            </Text>
          </View>
        </View>
      ) : null}

      {toast ? (
        <View pointerEvents="box-none" style={styles.toastLayer}>
          <Animated.View
            style={[
              styles.toastWrap,
              {
                bottom: Math.max(insets.bottom + 14, bottomTabBarHeight + 10),
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
              },
            ]}
          >
            <Pressable
              onPress={hideToast}
              style={[
                styles.toastCard,
                {
                  backgroundColor: toastPalette.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={[styles.toastIconWrap, { backgroundColor: toastPalette.accent }]}>
                <Feather color={theme.colors.primaryContrast} name={toastPalette.icon} size={15} />
              </View>
              <View style={styles.toastCopy}>
                {toast.title ? (
                  <Text numberOfLines={1} style={[styles.toastTitle, { color: theme.colors.textPrimary }]}>
                    {toast.title}
                  </Text>
                ) : null}
                <Text numberOfLines={3} style={[styles.toastMessage, { color: theme.colors.textSecondary }]}>
                  {toast.message}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);

  if (!context) {
    throw new Error('useAppFeedback must be used inside AppFeedbackProvider.');
  }

  return context;
}

const styles = StyleSheet.create({
  loaderCard: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    gap: 10,
    maxWidth: 280,
    paddingHorizontal: 24,
    paddingVertical: 26,
    shadowColor: '#081120',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
  },
  loaderMessage: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(8, 17, 32, 0.42)',
    justifyContent: 'center',
    zIndex: 1200,
  },
  loaderTitle: {
    ...typography.displayBold,
    fontSize: fontSize.lg,
    letterSpacing: -0.4,
  },
  toastCard: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#081120',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
  toastCopy: {
    flex: 1,
    gap: 2,
  },
  toastIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  toastLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1100,
  },
  toastMessage: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  toastTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  toastWrap: {
    left: 16,
    position: 'absolute',
    right: 16,
  },
});
