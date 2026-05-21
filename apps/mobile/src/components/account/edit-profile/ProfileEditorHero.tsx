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
    <View style={styles.hero}>
      <Pressable disabled={!onAvatarPress} onPress={onAvatarPress} style={styles.avatarWrap}>
        <View style={[styles.avatarRing, { borderColor: theme.colors.primarySoft }]}>
          <ProfileAvatar imageUrl={avatarUrlOverride ?? profile.profile_picture} label={displayName} size={76} />
        </View>
        {onAvatarPress ? (
          <View style={[styles.cameraOverlay, { backgroundColor: theme.colors.primary }]}>
            <Feather color={theme.colors.primaryContrast} name="camera" size={13} />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{displayName}</Text>
        <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>@{profile.username}</Text>
        {onAvatarPress ? (
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>Tap avatar to update photo</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRing: {
    borderRadius: 46,
    borderWidth: 3,
    padding: 3,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraOverlay: {
    alignItems: 'center',
    borderRadius: 12,
    bottom: 3,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 3,
    width: 24,
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
    flexDirection: 'row',
    gap: 16,
  },
  hint: {
    ...typography.bodyRegular,
    fontSize: 11,
    marginTop: 2,
  },
  name: {
    ...typography.displayBold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
});
