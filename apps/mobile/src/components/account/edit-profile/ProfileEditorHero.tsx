import { StyleSheet, Text, View } from 'react-native';
import type { MobileAccountProfile } from '@data/graphql/query/User/types';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type ProfileEditorHeroProps = {
  profile: MobileAccountProfile;
};

export function ProfileEditorHero({ profile }: ProfileEditorHeroProps) {
  const { theme } = useAppTheme();
  const displayName = getDisplayName(profile);

  return (
    <View style={[styles.hero, { borderBottomColor: theme.colors.border }]}>
      <ProfileAvatar imageUrl={profile.profile_picture} label={displayName} size={76} />
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{displayName}</Text>
        <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>@{profile.username}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 19,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  handle: {
    ...typography.bodyMedium,
    fontSize: 14,
  },
  hero: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 22,
  },
  name: {
    ...typography.displayBold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
});
