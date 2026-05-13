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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AppDrawer } from '@/components/navigation/AppDrawer';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { navigationRef } from '@/app/navigation/navigationRef';
import { AppProviders } from '@/app/AppProviders';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

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
      <AppProviders>
        <AppContent />
      </AppProviders>
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
