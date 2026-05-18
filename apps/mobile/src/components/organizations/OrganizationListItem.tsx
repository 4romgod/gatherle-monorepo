import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileOrganization } from '@data/graphql/query/Discovery/types';
import { formatCountLabel, getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type OrganizationListItemProps = {
  onPress?: () => void;
  organization: MobileOrganization;
  trailingActionLabel?: string;
  trailingActionOnPress?: () => void;
  trailingBadgeLabel?: string;
};

export function OrganizationListItem({
  onPress,
  organization,
  trailingActionLabel,
  trailingActionOnPress,
  trailingBadgeLabel,
}: OrganizationListItemProps) {
  const { theme } = useAppTheme();
  const label = organization.name ?? 'Organization';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surfaceMuted,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {organization.logo ? (
        <Image source={{ uri: organization.logo }} style={styles.logo} />
      ) : (
        <View style={[styles.logoFallback, { backgroundColor: theme.colors.primarySoft }]}>
          <Text style={[styles.logoFallbackText, { color: theme.colors.primary }]}>{getInitials(label)}</Text>
        </View>
      )}

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
        <Text numberOfLines={2} style={[styles.description, { color: theme.colors.textSecondary }]}>
          {organization.description || 'Community-led organizer on Gatherle.'}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: theme.colors.textPrimary }]}>
          {formatCountLabel(organization.followersCount, 'follower')}
        </Text>
        {trailingBadgeLabel ? (
          <View style={[styles.roleBadge, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>{trailingBadgeLabel}</Text>
          </View>
        ) : null}
        {trailingActionLabel && trailingActionOnPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={trailingActionOnPress}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>{trailingActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  logo: {
    borderRadius: 14,
    height: 50,
    width: 50,
  },
  logoFallback: {
    alignItems: 'center',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  logoFallbackText: {
    ...typography.displayBold,
    fontSize: 16,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionButtonText: {
    ...typography.bodySemiBold,
    fontSize: 11,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  metaText: {
    ...typography.bodyBold,
    fontSize: 11,
  },
  roleBadge: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleBadgeText: {
    ...typography.bodySemiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
