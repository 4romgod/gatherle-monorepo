import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { MobileAccountProfile } from '@data/graphql/query/User/types';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type ProfileEditorHeroProps = {
  avatarUrlOverride?: string | null;
  onAvatarPress?: () => void;
  profile: MobileAccountProfile;
};

export function ProfileEditorHero({ avatarUrlOverride, onAvatarPress, profile }: ProfileEditorHeroProps) {
  const { theme } = useAppTheme();
  const displayName = getDisplayName(profile);

  return (
    <View style={[styles.hero, { borderBottomColor: theme.colors.border }]}>
      <Pressable disabled={!onAvatarPress} onPress={onAvatarPress} style={styles.avatarWrap}>
        <ProfileAvatar imageUrl={avatarUrlOverride ?? profile.profile_picture} label={displayName} size={76} />
        {onAvatarPress ? (
          <View style={[styles.cameraOverlay, { backgroundColor: theme.colors.primary }]}>
            <Feather color={theme.colors.primaryContrast} name="camera" size={12} />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{displayName}</Text>
        <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>@{profile.username}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    position: 'relative',
  },
  cameraOverlay: {
    alignItems: 'center',
    borderRadius: 11,
    bottom: 0,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 22,
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
