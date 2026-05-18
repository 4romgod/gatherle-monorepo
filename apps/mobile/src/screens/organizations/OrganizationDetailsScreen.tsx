import { useCallback, useLayoutEffect, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { FollowTargetType, OrganizationRole, SortOrderInput } from '@data/graphql/types/graphql';
import { GetMyOrganizationsDocument, GetOrganizationByIdDocument } from '@data/graphql/query/Organization/query';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { PageContainer } from '@/components/core/PageContainer';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { StateNotice } from '@/components/core/StateNotice';
import { DetailSection } from '@/components/details/DetailSection';
import { DetailStatChip } from '@/components/details/DetailStatChip';
import { EventTileGrid } from '@/components/events/EventTileGrid';
import { InlineButton } from '@/components/core/InlineButton';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { EventTileGridSkeleton } from '@/components/skeleton/EventTileGridSkeleton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { usePublicEvents } from '@/hooks/events/usePublicEvents';
import { useFollowTarget } from '@/hooks/follow/useFollowTarget';
import { getApolloAuthContext } from '@/lib/auth';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type OrganizationDetailsRoute = RouteProp<RootStackParamList, 'OrganizationDetails'>;

export function OrganizationDetailsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<OrganizationDetailsRoute>();
  const { authToken, isAuthenticated, userId } = useAppShell();
  const { theme } = useAppTheme();
  const { orgId } = route.params;
  const { data, error, loading, refetch } = useQuery(GetOrganizationByIdDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { orgId },
    ...getApolloAuthContext(authToken),
  });
  const membershipsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });
  const organization = data?.readOrganizationById ?? null;
  const membership =
    membershipsQuery.data?.readMyOrganizations?.find((item) => item.organization.orgId === orgId) ?? null;
  const canEditOrganization =
    organization?.ownerId === userId ||
    membership?.role === OrganizationRole.Owner ||
    membership?.role === OrganizationRole.Admin;
  const { follow, isFollowing, isPending, unfollow } = useFollowTarget({
    authToken,
    targetId: orgId,
    targetType: FollowTargetType.Organization,
  });
  const {
    error: eventsError,
    loading: eventsLoading,
    occurrences,
    refetch: refetchEvents,
  } = usePublicEvents(
    {
      filters: [{ field: 'orgId', value: orgId }],
      pagination: { limit: 12 },
      sort: [{ field: 'createdAt', order: SortOrderInput.Desc }],
    },
    authToken,
  );
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetch(), refetchEvents()]);
    }, [refetch, refetchEvents]),
  );

  const primaryLink = organization?.links?.[0]?.url ?? null;
  const followLabel = !isAuthenticated
    ? 'Login to follow'
    : isFollowing
      ? 'Following'
      : isPending
        ? 'Requested'
        : 'Follow';
  const domainList = useMemo(() => organization?.domainsAllowed?.filter(Boolean) ?? [], [organization?.domainsAllowed]);
  const tagList = useMemo(() => organization?.tags?.filter(Boolean) ?? [], [organization?.tags]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canEditOrganization
        ? () => (
            <Pressable
              accessibilityLabel="Edit organization"
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('EditOrganization', {
                  orgId,
                  orgName: organization?.name ?? undefined,
                })
              }
              style={({ pressed }) => [
                styles.headerAction,
                {
                  opacity: pressed ? 0.64 : 1,
                },
              ]}
            >
              <Feather color={theme.colors.primary} name="edit-2" size={18} />
            </Pressable>
          )
        : undefined,
    });
  }, [canEditOrganization, navigation, orgId, organization?.name, theme.colors.primary]);

  const handleFollowPress = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    if (isFollowing || isPending) {
      void unfollow();
      return;
    }

    void follow();
  };

  const handleOpenLink = (url?: string | null) => {
    if (!url) {
      return;
    }

    void Linking.openURL(url);
  };

  if (loading && !organization) {
    return (
      <PageContainer>
        <View style={styles.loadingGroup}>
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={72} />
          <StateNotice message="Loading organization..." />
        </View>
      </PageContainer>
    );
  }

  if ((error && !organization) || !organization) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load this organization."
          onPressAction={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <ProfileAvatar imageUrl={organization.logo} label={organization.name} size={74} />
          <View style={styles.heroCopy}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{organization.name}</Text>
            <Text numberOfLines={3} style={[styles.description, { color: theme.colors.textSecondary }]}>
              {organization.description || 'This organization has not added a description yet.'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <InlineButton
            compact
            label={followLabel}
            onPress={handleFollowPress}
            tone={isFollowing || isPending ? 'neutral' : 'primary'}
          />
          {primaryLink ? (
            <InlineButton compact label="Visit link" onPress={() => handleOpenLink(primaryLink)} tone="neutral" />
          ) : null}
        </View>
      </View>

      <View style={styles.statRow}>
        <DetailStatChip label="Followers" value={String(organization.followersCount ?? 0)} />
        <DetailStatChip label="Domains" value={String(domainList.length)} />
        <DetailStatChip label="Tags" value={String(tagList.length)} />
      </View>

      {tagList.length > 0 ? (
        <DetailSection title="Tags">
          <View style={styles.pillWrap}>
            {tagList.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.metaPillText, { color: theme.colors.textPrimary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        </DetailSection>
      ) : null}

      {domainList.length > 0 ? (
        <DetailSection title="Allowed domains">
          <View style={styles.pillWrap}>
            {domainList.map((domain) => (
              <Pressable
                key={domain}
                onPress={() => handleOpenLink(`https://${domain}`)}
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.metaPillText, { color: theme.colors.primary }]}>{domain}</Text>
              </Pressable>
            ))}
          </View>
        </DetailSection>
      ) : null}

      <DetailSection title="Hosted events">
        {eventsLoading && occurrences.length === 0 ? (
          <EventTileGridSkeleton count={6} />
        ) : eventsError ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load this organization’s events."
            onPressAction={() => void refetchEvents()}
          />
        ) : occurrences.length > 0 ? (
          <EventTileGrid
            occurrences={occurrences}
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
          />
        ) : (
          <StateNotice message="No events from this organization are available right now." />
        )}
      </DetailSection>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 40,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  loadingGroup: {
    gap: 18,
  },
  metaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    ...typography.bodyMedium,
    fontSize: 12,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  title: {
    ...typography.displayBold,
    fontSize: 24,
    letterSpacing: -0.7,
  },
});
