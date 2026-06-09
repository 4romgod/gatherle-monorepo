import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import { ApolloProvider } from '@apollo/client';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from '@data/graphql/apollo-client';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AppFeedbackProvider } from '@/app/providers/AppFeedbackProvider';
import { AppShellProvider } from '@/app/providers/AppShellProvider';
import { MobileDeviceAccessProvider, useMobileDeviceAccess } from '@/app/providers/MobileDeviceAccessProvider';
import { PushNotificationsProvider } from '@/app/providers/PushNotificationsProvider';
import { usePushNotifications } from '@/app/providers/PushNotificationsProvider';
import { RealtimeInboxProvider } from '@/app/providers/RealtimeInboxProvider';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { navigationRef } from '@/app/navigation/navigationRef';
import { AppThemeProvider } from '@/app/theme/AppThemeProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { AppUserAccessGate } from '@/components/core/AppUserAccessGate';
import { AppErrorBoundary } from '@/components/core/AppErrorBoundary';
import { MobileDeviceAccessGate } from '@/components/core/MobileDeviceAccessGate';
import { MobileRuntimeErrorReporter } from '@/components/core/MobileRuntimeErrorReporter';
import { configureMobileGoogleSignIn } from '@/lib/auth/googleSignIn';

function AppContent() {
  const { isDark, navigationTheme } = useAppTheme();
  const { blockedSessionMessage, dismissBlockedSessionNotice, isSessionReady } = useAppShell();
  const { handlePendingNotificationResponse } = usePushNotifications();

  if (!isSessionReady) {
    return (
      <View style={[styles.loadingFrame, { backgroundColor: navigationTheme.colors.background }]}>
        <ActivityIndicator color={navigationTheme.colors.primary} size="large" />
      </View>
    );
  }

  if (blockedSessionMessage) {
    return <AppUserAccessGate message={blockedSessionMessage} onContinue={dismissBlockedSessionNotice} />;
  }

  return (
    <View style={styles.appFrame}>
      <NavigationContainer
        onReady={() => {
          void handlePendingNotificationResponse();
        }}
        ref={navigationRef}
        theme={navigationTheme}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
}

function ApprovedAppRuntime() {
  return (
    <AppShellProvider>
      <PushNotificationsProvider>
        <RealtimeInboxProvider>
          <AppFeedbackProvider>
            <BottomSheetModalProvider>
              <AppContent />
            </BottomSheetModalProvider>
          </AppFeedbackProvider>
        </RealtimeInboxProvider>
      </PushNotificationsProvider>
    </AppShellProvider>
  );
}

function AppBootstrap() {
  const { isApproved } = useMobileDeviceAccess();

  if (!isApproved) {
    return <MobileDeviceAccessGate />;
  }

  return <ApprovedAppRuntime />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    configureMobileGoogleSignIn();
  }, []);

  const systemScheme = useColorScheme();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppErrorBoundary isDark={systemScheme === 'dark'}>
        <ApolloProvider client={apolloClient}>
          <SafeAreaProvider>
            <AppThemeProvider>
              <KeyboardProvider>
                <MobileDeviceAccessProvider>
                  <MobileRuntimeErrorReporter />
                  <AppBootstrap />
                </MobileDeviceAccessProvider>
              </KeyboardProvider>
            </AppThemeProvider>
          </SafeAreaProvider>
        </ApolloProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  appFrame: {
    flex: 1,
  },
  loadingFrame: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
