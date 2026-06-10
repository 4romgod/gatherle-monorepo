import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { MobileOrganizationMember } from '@data/graphql/query/OrganizationMembership/types';
import { OrganizationRole } from '@data/graphql/types/graphql';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { InlineButton } from '@/components/core/InlineButton';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';

type OrganizationMemberRowProps = {
  canEditMembership: boolean;
  canLeaveMembership?: boolean;
  canMakeOwner?: boolean;
  isCurrentUser: boolean;
  isExpanded: boolean;
  isOwnerMembership: boolean;
  membership: MobileOrganizationMember;
  onPressAvatar?: () => void;
  onPressMakeOwner?: () => void;
  onPressManage: () => void;
  onPressRemove: () => void;
  onSelectRole: (role: OrganizationRole) => void;
  removeLabel?: string;
  roleOptions: OrganizationRole[];
};

function formatRoleLabel(role: OrganizationRole) {
  return role.replace(/[_-]+/g, ' ');
}

export function OrganizationMemberRow({
  canEditMembership,
  canLeaveMembership,
  canMakeOwner,
  isCurrentUser,
  isExpanded,
  isOwnerMembership,
  membership,
  onPressAvatar,
  onPressMakeOwner,
  onPressManage,
  onPressRemove,
  onSelectRole,
  removeLabel,
  roleOptions,
}: OrganizationMemberRowProps) {
  const { theme } = useAppTheme();
  const joinedLabel = `Joined ${new Date(membership.joinedAt).toLocaleDateString()}`;
  const titleLabel = membership.username ? `@${membership.username}` : membership.userId;
  const avatar = <ProfileAvatar label={membership.username ?? null} size={52} />;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceRaised }]}>
      <View style={styles.headerRow}>
        <View style={styles.identity}>
          {onPressAvatar ? (
            <Pressable
              accessibilityLabel={`View ${titleLabel} moments`}
              accessibilityRole="button"
              onPress={onPressAvatar}
              style={({ pressed }) => [styles.avatarButton, { opacity: pressed ? 0.78 : 1 }]}
            >
              {avatar}
            </Pressable>
          ) : (
            avatar
          )}

          <View style={styles.copy}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
              {titleLabel}
            </Text>
            <Text numberOfLines={1} style={[styles.meta, { color: theme.colors.textSecondary }]}>
              {joinedLabel}
            </Text>
          </View>
        </View>

        <View style={styles.trailing}>
          <View style={[styles.roleBadge, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>
              {formatRoleLabel(membership.role)}
            </Text>
          </View>

          {canEditMembership ? (
            <InlineButton compact label={isExpanded ? 'Close' : 'Manage'} onPress={onPressManage} tone="neutral" />
          ) : canLeaveMembership ? (
            <InlineButton compact label="Leave" onPress={onPressRemove} tone="neutral" />
          ) : isCurrentUser ? (
            <View style={[styles.youBadge, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.youBadgeText, { color: theme.colors.textPrimary }]}>You</Text>
            </View>
          ) : null}
        </View>
      </View>

      {isExpanded ? (
        <View style={styles.expandedSection}>
          <View style={styles.roleWrap}>
            {roleOptions.map((role) => (
              <AccountChoiceChip
                key={`${membership.membershipId}-${role}`}
                label={formatRoleLabel(role)}
                onPress={() => onSelectRole(role)}
                selected={membership.role === role}
              />
            ))}
          </View>

          <InlineButton compact label={removeLabel ?? 'Remove member'} onPress={onPressRemove} tone="neutral" />
        </View>
      ) : null}

      {canMakeOwner && onPressMakeOwner ? (
        <View style={styles.ownerActionRow}>
          <InlineButton compact label="Make owner" onPress={onPressMakeOwner} tone="primary" />
        </View>
      ) : null}

      {isOwnerMembership ? (
        <View style={styles.ownerNoteRow}>
          <Feather color={theme.colors.textMuted} name="shield" size={14} />
          <Text style={[styles.ownerNote, { color: theme.colors.textSecondary }]}>
            To change the owner, tap “Make owner” on another member.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  avatarButton: {
    borderRadius: 999,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  expandedSection: {
    gap: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  meta: {
    ...typography.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: 17,
  },
  ownerNote: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  ownerNoteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ownerActionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  roleBadge: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleBadgeText: {
    ...typography.bodySemiBold,
    fontSize: 12,
  },
  roleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  title: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
  trailing: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 8,
  },
  youBadge: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  youBadgeText: {
    ...typography.bodySemiBold,
    fontSize: 12,
  },
});
