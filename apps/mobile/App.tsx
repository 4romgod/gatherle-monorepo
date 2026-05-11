import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApolloProvider, gql, useQuery } from '@apollo/client';
import { apolloClient, graphqlUrl } from './data/graphql/apollo-client';

const MOBILE_HEALTH_CHECK = gql`
  query MobileHealthCheck {
    __typename
  }
`;

function ApiStatus() {
  const { data, error, loading, refetch } = useQuery(MOBILE_HEALTH_CHECK, {
    skip: !graphqlUrl,
  });

  if (!graphqlUrl) {
    return (
      <View style={[styles.statusPanel, styles.warningPanel]}>
        <Text style={styles.statusLabel}>API endpoint missing</Text>
        <Text style={styles.statusText}>Set EXPO_PUBLIC_GRAPHQL_URL in apps/mobile/.env.local.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.statusPanel}>
        <ActivityIndicator color="#125c4e" />
        <Text style={styles.statusText}>Checking GraphQL API...</Text>
        <Text style={styles.endpointText}>{graphqlUrl}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.statusPanel, styles.errorPanel]}>
        <Text style={styles.statusLabel}>API unavailable</Text>
        <Text style={styles.statusText}>{error.message}</Text>
        <Text style={styles.endpointText}>{graphqlUrl}</Text>
        <Pressable style={styles.retryButton} onPress={() => void refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.statusPanel, styles.successPanel]}>
      <Text style={styles.statusLabel}>API connected</Text>
      <Text style={styles.statusText}>GraphQL responded as {data?.__typename ?? 'Query'}.</Text>
      <Text style={styles.endpointText}>{graphqlUrl}</Text>
    </View>
  );
}

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Gatherle Mobile</Text>
          <Text style={styles.title}>Event discovery, built for the pocket.</Text>
          <Text style={styles.subtitle}>
            This shell is wired to the same GraphQL API contract as the webapp and ready for the first native flows.
          </Text>
        </View>
        <ApiStatus />
        <StatusBar style="dark" />
      </View>
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2efe7',
    paddingHorizontal: 24,
    paddingVertical: 56,
    justifyContent: 'space-between',
  },
  header: {
    gap: 14,
  },
  eyebrow: {
    color: '#125c4e',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#14211d',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 44,
  },
  subtitle: {
    color: '#4d5a55',
    fontSize: 17,
    lineHeight: 25,
  },
  statusPanel: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccd8d3',
    backgroundColor: '#fffdf8',
    padding: 18,
    gap: 10,
    justifyContent: 'center',
  },
  successPanel: {
    borderColor: '#7cbca8',
  },
  warningPanel: {
    borderColor: '#d6a84f',
  },
  errorPanel: {
    borderColor: '#d87767',
  },
  statusLabel: {
    color: '#14211d',
    fontSize: 18,
    fontWeight: '700',
  },
  statusText: {
    color: '#4d5a55',
    fontSize: 15,
    lineHeight: 22,
  },
  endpointText: {
    color: '#66736e',
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    backgroundColor: '#125c4e',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
