import { NavigationContainer } from '@react-navigation/native';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ApolloProvider } from '@apollo/client';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from '@data/graphql/apollo-client';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AppFeedbackProvider } from '@/app/providers/AppFeedbackProvider';
import { AppShellProvider } from '@/app/providers/AppShellProvider';
import { AppDrawer } from '@/app/navigation/AppDrawer';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { navigationRef } from '@/app/navigation/navigationRef';
import { AppThemeProvider } from '@/app/theme/AppThemeProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

function AppContent() {
  const { isDark, navigationTheme } = useAppTheme();
  const { isSessionReady } = useAppShell();

  if (!isSessionReady) {
    return (
      <View style={[styles.loadingFrame, { backgroundColor: navigationTheme.colors.background }]}>
        <ActivityIndicator color={navigationTheme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.appFrame}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
      <AppDrawer />
    </View>
  );
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ApolloProvider client={apolloClient}>
        <SafeAreaProvider>
          <AppThemeProvider>
            <KeyboardProvider>
              <AppShellProvider>
                <AppFeedbackProvider>
                  <BottomSheetModalProvider>
                    <AppContent />
                  </BottomSheetModalProvider>
                </AppFeedbackProvider>
              </AppShellProvider>
            </KeyboardProvider>
          </AppThemeProvider>
        </SafeAreaProvider>
      </ApolloProvider>
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
