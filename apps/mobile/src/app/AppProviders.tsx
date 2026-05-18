import { PropsWithChildren } from 'react';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from '@data/graphql/apollo-client';
import { AppShellProvider } from './providers/AppShellProvider';
import { AppFeedbackProvider } from './providers/AppFeedbackProvider';
import { AppThemeProvider } from '@/shared/theme/AppThemeProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ApolloProvider client={apolloClient}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <AppShellProvider>
            <AppFeedbackProvider>{children}</AppFeedbackProvider>
          </AppShellProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </ApolloProvider>
  );
}
