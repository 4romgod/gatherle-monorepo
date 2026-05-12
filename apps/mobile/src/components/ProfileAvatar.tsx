import { Image, StyleSheet, Text, View } from 'react-native';
import { MockUser } from '../shell/AppShellProvider';
import { useAppTheme } from '../theme/AppThemeProvider';

type ProfileAvatarProps = {
  active?: boolean;
  size?: number;
  user: MockUser;
};

export function ProfileAvatar({ active = false, size = 30, user }: ProfileAvatarProps) {
  const { theme } = useAppTheme();
  const borderColor = active ? theme.colors.primary : theme.colors.border;

  if (user.avatarUrl) {
    return (
      <View
        style={[
          styles.frame,
          {
            borderColor,
            borderRadius: size / 2,
            height: size,
            width: size,
          },
        ]}
      >
        <Image
          source={{ uri: user.avatarUrl }}
          style={{ borderRadius: size / 2 - 2, height: size - 4, width: size - 4 }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceMuted,
          borderColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <Text style={[styles.initials, { color: theme.colors.textPrimary, fontSize: size * 0.36 }]}>{user.initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    borderWidth: 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    borderWidth: 2,
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
