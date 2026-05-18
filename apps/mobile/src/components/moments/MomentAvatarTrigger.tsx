import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type MomentAuthorLike = {
  family_name?: string | null;
  given_name?: string | null;
  profile_picture?: string | null;
  username?: string | null;
};

export function MomentAvatarTrigger({
  author,
  label,
  onPress,
  size = 88,
}: {
  author?: MomentAuthorLike | null;
  label: string;
  onPress: () => void;
  size?: number;
}) {
  const { theme } = useAppTheme();
  const ringSize = size + 8;

  return (
    <Pressable onPress={onPress} style={styles.shell}>
      <LinearGradient
        colors={theme.colors.heroGradient}
        style={[styles.ring, { borderRadius: ringSize / 2, height: ringSize, width: ringSize }]}
      >
        <View style={[styles.innerRing, { backgroundColor: theme.colors.background, borderRadius: size / 2 }]}>
          <ProfileAvatar imageUrl={author?.profile_picture} label={label} size={size} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  innerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.5,
  },
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
