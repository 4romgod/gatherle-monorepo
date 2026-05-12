import { ApolloProvider } from '@apollo/client';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from './data/graphql/apollo-client';
import { AppDrawer } from './src/components/AppDrawer';
import { navigationRef } from './src/navigation/navigationRef';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppShellProvider } from './src/shell/AppShellProvider';
import { AppThemeProvider, useAppTheme } from './src/theme/AppThemeProvider';

function AppContent() {
  const { isDark, navigationTheme } = useAppTheme();

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
  return (
    <GestureHandlerRootView style={styles.root}>
      <ApolloProvider client={apolloClient}>
        <SafeAreaProvider>
          <AppThemeProvider>
            <AppShellProvider>
              <AppContent />
            </AppShellProvider>
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
});
