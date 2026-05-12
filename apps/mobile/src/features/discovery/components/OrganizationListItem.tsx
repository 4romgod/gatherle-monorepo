import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileOrganization } from '@data/graphql/query/Discovery/types';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';
import { formatCountLabel, getInitials } from '@/features/discovery/lib/mobileFormatters';

type OrganizationListItemProps = {
  organization: MobileOrganization;
};

export function OrganizationListItem({ organization }: OrganizationListItemProps) {
  const { theme } = useAppTheme();
  const label = organization.name ?? 'Organization';

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
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
  },
  metaText: {
    ...typography.bodyBold,
    fontSize: 11,
  },
});
