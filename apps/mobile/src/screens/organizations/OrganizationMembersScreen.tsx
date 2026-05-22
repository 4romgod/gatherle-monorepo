import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { CreateOrganizationMembershipDocument } from '@data/graphql/mutation/OrganizationMembership/mutation';
import {
  DeleteOrganizationMembershipDocument,
  UpdateOrganizationMembershipDocument,
} from '@data/graphql/mutation/OrganizationMembership/mutation';
import { GetOrganizationByIdDocument, GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { GetOrganizationMembershipsByOrgIdDocument } from '@data/graphql/query/OrganizationMembership/query';
import { GetUsersDocument } from '@data/graphql/query/User/query';
import type { MobileDirectoryUser } from '@data/graphql/query/User/types';
import { OrganizationRole, QueryOptionsInput } from '@data/graphql/types/graphql';
import type { RootStackParamList } from '@/app/navigation/routes';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountSectionCard } from '@/components/account/shared/AccountSectionCard';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { InlineButton } from '@/components/core/InlineButton';
import { PageContainer } from '@/components/core/PageContainer';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { OrganizationMemberRow } from '@/components/organizations/OrganizationMemberRow';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { OrganizationMemberRowSkeleton } from '@/components/skeleton/OrganizationMemberRowSkeleton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';
import { getDisplayName } from '@/lib/events/formatters';

type OrganizationMembersRoute = RouteProp<RootStackParamList, 'OrganizationMembers'>;

const INVITABLE_ROLE_OPTIONS = [
  OrganizationRole.Member,
  OrganizationRole.Moderator,
  OrganizationRole.Host,
  OrganizationRole.Admin,
];

const ROLE_PRIORITY: Record<OrganizationRole, number> = {
  [OrganizationRole.Owner]: 0,
  [OrganizationRole.Admin]: 1,
  [OrganizationRole.Host]: 2,
  [OrganizationRole.Moderator]: 3,
  [OrganizationRole.Member]: 4,
};

function formatRoleLabel(role: OrganizationRole) {
  return role.replace(/[_-]+/g, ' ');
}

export function OrganizationMembersScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<OrganizationMembersRoute>();
  const { orgId } = route.params;
  const { authToken, isAuthenticated, userId } = useAppShell();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const { theme } = useAppTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>(OrganizationRole.Member);
  const [expandedMembershipId, setExpandedMembershipId] = useState<string | null>(null);

  const organizationQuery = useQuery(GetOrganizationByIdDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { orgId },
    ...getApolloAuthContext(authToken),
  });
  const myOrganizationsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });
  const membershipsQuery = useQuery(GetOrganizationMembershipsByOrgIdDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    variables: { orgId },
    ...getApolloAuthContext(authToken),
  });
  const [searchUsers, { data: searchResults, loading: searchLoading }] = useLazyQuery(GetUsersDocument, {
    fetchPolicy: 'network-only',
    ...getApolloAuthContext(authToken),
  });

  const [createMembership] = useMutation(CreateOrganizationMembershipDocument, getApolloAuthContext(authToken));
  const [updateMembership] = useMutation(UpdateOrganizationMembershipDocument, getApolloAuthContext(authToken));
  const [deleteMembership] = useMutation(DeleteOrganizationMembershipDocument, getApolloAuthContext(authToken));

  const organization = organizationQuery.data?.readOrganizationById ?? null;
  const currentMembership =
    myOrganizationsQuery.data?.readMyOrganizations?.find((membership) => membership.organization.orgId === orgId) ??
    null;
  const canManageMembers =
    organization?.ownerId === userId ||
    currentMembership?.role === OrganizationRole.Owner ||
    currentMembership?.role === OrganizationRole.Admin;

  const memberships = useMemo(() => {
    const items = membershipsQuery.data?.readOrganizationMembershipsByOrgId ?? [];
    return [...items].sort((left, right) => {
      const roleDiff = ROLE_PRIORITY[left.role] - ROLE_PRIORITY[right.role];
      if (roleDiff !== 0) {
        return roleDiff;
      }
      return (left.username ?? left.userId).localeCompare(right.username ?? right.userId);
    });
  }, [membershipsQuery.data?.readOrganizationMembershipsByOrgId]);

  const availableUsers = useMemo(() => {
    const existingMemberIds = new Set(memberships.map((membership) => membership.userId));
    return (searchResults?.readUsers ?? []).filter((user) => !existingMemberIds.has(user.userId));
  }, [memberships, searchResults?.readUsers]);

  useEffect(() => {
    if (!canManageMembers) {
      return;
    }

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch.length < 2) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const options: QueryOptionsInput = {
        pagination: { limit: 20 },
        search: {
          fields: ['username', 'email', 'given_name', 'family_name'],
          value: trimmedSearch,
        },
      };

      void searchUsers({
        variables: { options },
      });
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [canManageMembers, searchTerm, searchUsers]);

  const refetchAll = useCallback(async () => {
    await Promise.all([organizationQuery.refetch(), membershipsQuery.refetch(), myOrganizationsQuery.refetch()]);
  }, [membershipsQuery, myOrganizationsQuery, organizationQuery]);

  const { onRefresh, refreshing } = usePullToRefresh(refetchAll);

  const handleInviteUser = useCallback(
    async (user: MobileDirectoryUser) => {
      try {
        await withBlockingLoader('Adding member…', async () => {
          await createMembership({
            variables: {
              input: {
                orgId,
                role: inviteRole,
                userId: user.userId,
              },
            },
          });
          await membershipsQuery.refetch();
        });

        setSearchTerm('');
        showToast({ message: 'Member added successfully.', tone: 'success' });
      } catch (error) {
        showToast({
          message: error instanceof Error ? error.message : "We couldn't add this member.",
          tone: 'error',
        });
      }
    },
    [createMembership, inviteRole, membershipsQuery, orgId, showToast, withBlockingLoader],
  );

  const handleUpdateRole = useCallback(
    async (membershipId: string, nextRole: OrganizationRole) => {
      const membership = memberships.find((item) => item.membershipId === membershipId);
      if (!membership || membership.role === nextRole) {
        setExpandedMembershipId(null);
        return;
      }

      try {
        await withBlockingLoader('Updating role…', async () => {
          await updateMembership({
            variables: {
              input: {
                membershipId,
                role: nextRole,
              },
            },
          });
          await membershipsQuery.refetch();
        });

        setExpandedMembershipId(null);
        showToast({ message: 'Member role updated.', tone: 'success' });
      } catch (error) {
        showToast({
          message: error instanceof Error ? error.message : "We couldn't update this member.",
          tone: 'error',
        });
      }
    },
    [memberships, membershipsQuery, showToast, updateMembership, withBlockingLoader],
  );

  const handleRemoveMember = useCallback(
    (membershipId: string, username?: string | null) => {
      Alert.alert(
        'Remove member',
        username ? `Remove @${username} from this organization?` : 'Remove this member from the organization?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await withBlockingLoader('Removing member…', async () => {
                    await deleteMembership({
                      variables: {
                        input: { membershipId },
                      },
                    });
                    await membershipsQuery.refetch();
                  });

                  setExpandedMembershipId(null);
                  showToast({ message: 'Member removed.', tone: 'success' });
                } catch (error) {
                  showToast({
                    message: error instanceof Error ? error.message : "We couldn't remove this member.",
                    tone: 'error',
                  });
                }
              })();
            },
          },
        ],
      );
    },
    [deleteMembership, membershipsQuery, showToast, withBlockingLoader],
  );

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <AuthPromptCard
          description="Sign in with an organization owner or admin account to manage team members."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Team management requires sign-in"
        />
      </PageContainer>
    );
  }

  if ((organizationQuery.loading || membershipsQuery.loading) && !organization && memberships.length === 0) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.list}>
          <OrganizationMemberRowSkeleton />
          <OrganizationMemberRowSkeleton />
          <OrganizationMemberRowSkeleton />
        </View>
      </PageContainer>
    );
  }

  if ((organizationQuery.error && !organization) || !organization) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load this organization team."
          onPressAction={() => void refetchAll()}
        />
      </PageContainer>
    );
  }

  if (!canManageMembers) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice message="Only organization owners and admins can manage team members." />
      </PageContainer>
    );
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.sectionWrap}>
        <AccountSectionCard
          description={`Search Gatherle members to add them to ${organization.name}.`}
          title="Team access"
        >
          <SearchField
            onChangeText={setSearchTerm}
            placeholder="Search by username, email, or name"
            value={searchTerm}
          />

          <View style={styles.roleWrap}>
            {INVITABLE_ROLE_OPTIONS.map((role) => (
              <AccountChoiceChip
                key={role}
                label={formatRoleLabel(role)}
                onPress={() => setInviteRole(role)}
                selected={inviteRole === role}
              />
            ))}
          </View>

          {searchTerm.trim().length < 2 ? (
            <StateNotice message="Type at least 2 characters to search for members to invite." />
          ) : searchLoading ? (
            <View style={styles.list}>
              <DirectoryRowSkeleton avatarSize={42} />
              <DirectoryRowSkeleton avatarSize={42} />
            </View>
          ) : availableUsers.length > 0 ? (
            <View style={styles.list}>
              {availableUsers.map((user) => (
                <Pressable
                  key={user.userId}
                  onPress={() => void handleInviteUser(user)}
                  style={({ pressed }) => [
                    styles.memberCard,
                    {
                      backgroundColor: theme.colors.surfaceRaised,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={styles.memberIdentity}>
                    <ProfileAvatar imageUrl={user.profile_picture} label={getDisplayName(user)} size={44} />
                    <View style={styles.memberCopy}>
                      <Text numberOfLines={1} style={[styles.memberName, { color: theme.colors.textPrimary }]}>
                        {getDisplayName(user)}
                      </Text>
                      {user.username ? (
                        <Text numberOfLines={1} style={[styles.memberMeta, { color: theme.colors.textSecondary }]}>
                          @{user.username}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <InlineButton
                    compact
                    label={`Add as ${formatRoleLabel(inviteRole)}`}
                    onPress={() => void handleInviteUser(user)}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <StateNotice message="No eligible members matched your search." />
          )}
        </AccountSectionCard>
      </View>

      <View style={styles.sectionWrap}>
        <AccountSectionCard
          description="Owner transfers stay out of this surface. Owners and your own membership are view-only here."
          title={`${memberships.length} team member${memberships.length === 1 ? '' : 's'}`}
        >
          {memberships.length > 0 ? (
            <View style={styles.list}>
              {memberships.map((membership) => {
                const isCurrentUser = membership.userId === userId;
                const isOwnerMembership = membership.role === OrganizationRole.Owner;
                const canEditMembership = !isCurrentUser && !isOwnerMembership;
                const isExpanded = expandedMembershipId === membership.membershipId;

                return (
                  <OrganizationMemberRow
                    canEditMembership={canEditMembership}
                    isCurrentUser={isCurrentUser}
                    isExpanded={isExpanded}
                    isOwnerMembership={isOwnerMembership}
                    key={membership.membershipId}
                    membership={membership}
                    onPressAvatar={() =>
                      navigation.navigate('UserProfile', {
                        displayName: membership.username ?? 'Gatherle member',
                        openMoments: true,
                        userId: membership.userId,
                        username: membership.username,
                      })
                    }
                    onPressManage={() =>
                      setExpandedMembershipId((current) =>
                        current === membership.membershipId ? null : membership.membershipId,
                      )
                    }
                    onPressRemove={() => handleRemoveMember(membership.membershipId, membership.username)}
                    onSelectRole={(role) => void handleUpdateRole(membership.membershipId, role)}
                    roleOptions={INVITABLE_ROLE_OPTIONS}
                  />
                );
              })}
            </View>
          ) : (
            <StateNotice message="This organization does not have any team members yet." />
          )}
        </AccountSectionCard>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  memberCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  memberCopy: {
    flex: 1,
    gap: 4,
  },
  memberIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  memberMeta: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  memberName: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  roleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionWrap: {
    gap: 16,
  },
});
