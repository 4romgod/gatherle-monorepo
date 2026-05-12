import { gql, useQuery } from '@apollo/client';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { graphqlUrl } from '../../data/graphql/apollo-client';
import { useAppTheme } from '../theme/AppThemeProvider';
import { SectionCard, TonePill } from './ScreenLayout';

const MOBILE_HEALTH_CHECK = gql`
  query MobileHealthCheck {
    __typename
  }
`;

export function ApiStatusCard() {
  const { theme } = useAppTheme();
  const { data, error, loading, refetch } = useQuery(MOBILE_HEALTH_CHECK, {
    skip: !graphqlUrl,
  });

  let tone: 'success' | 'warning' | 'error' | 'neutral' = 'neutral';
  let label = 'Checking API';
  let message = 'Mobile is confirming that the shared GraphQL endpoint is reachable.';

  if (!graphqlUrl) {
    tone = 'warning';
    label = 'Endpoint missing';
    message = 'Set EXPO_PUBLIC_GRAPHQL_URL in apps/mobile/.env.local before testing live mobile flows.';
  } else if (error) {
    tone = 'error';
    label = 'API unavailable';
    message = error.message;
  } else if (!loading) {
    tone = 'success';
    label = 'API connected';
    message = `GraphQL responded as ${data?.__typename ?? 'Query'}.`;
  }

  return (
    <SectionCard
      description="The mobile app is still wired to the same GraphQL contract as the webapp."
      title="API status"
    >
      <View style={styles.stateRow}>
        {loading && graphqlUrl ? <ActivityIndicator color={theme.colors.primary} /> : null}
        <TonePill label={label} tone={tone} />
      </View>
      <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>{message}</Text>
      {graphqlUrl ? <Text style={[styles.endpointText, { color: theme.colors.textMuted }]}>{graphqlUrl}</Text> : null}
      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void refetch()}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.primaryContrast }]}>Retry</Text>
        </Pressable>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  endpointText: {
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
