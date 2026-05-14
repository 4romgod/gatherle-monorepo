import { useQuery } from '@apollo/client';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GRAPHQL_URL, isUsingDefaultGraphqlUrl } from '@data/graphql/apollo-client';
import { GetHealthCheckDocument } from '@data/graphql/query/Health/query';
import { SectionCard, TonePill } from '@/components/core/ScreenLayout';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

export function ApiStatusCard() {
  const { theme } = useAppTheme();
  const { data, error, loading, refetch } = useQuery(GetHealthCheckDocument, {
    skip: !GRAPHQL_URL,
  });

  let tone: 'success' | 'warning' | 'error' | 'neutral' = 'neutral';
  let label = 'Checking API';
  let message = 'Mobile is confirming that the shared GraphQL endpoint is reachable.';

  if (error) {
    tone = 'error';
    label = 'API unavailable';
    message = error.message;
  } else if (isUsingDefaultGraphqlUrl && !loading) {
    tone = 'warning';
    label = 'Using fallback endpoint';
    message = 'EXPO_PUBLIC_GRAPHQL_URL was missing, so mobile fell back to the beta API domain.';
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
        {loading && GRAPHQL_URL ? <ActivityIndicator color={theme.colors.primary} /> : null}
        <TonePill label={label} tone={tone} />
      </View>
      <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>{message}</Text>
      {GRAPHQL_URL ? <Text style={[styles.endpointText, { color: theme.colors.textMuted }]}>{GRAPHQL_URL}</Text> : null}
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
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  endpointText: {
    ...typography.bodyRegular,
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
    ...typography.bodyBold,
    fontSize: 14,
  },
});
