import { Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type ProfileAvatarProps = {
  active?: boolean;
  imageUrl?: string | null;
  label?: string | null;
  size?: number;
};

export function ProfileAvatar({ active = false, imageUrl, label, size = 30 }: ProfileAvatarProps) {
  const { theme } = useAppTheme();
  const borderColor = active ? theme.colors.primary : theme.colors.border;

  if (imageUrl) {
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
        <Image source={{ uri: imageUrl }} style={{ borderRadius: size / 2 - 2, height: size - 4, width: size - 4 }} />
      </View>
    );
  }

  const bg = active ? theme.colors.primarySoft : theme.colors.surfaceMuted;

  if (!label) {
    return (
      <View
        style={[
          styles.fallback,
          { backgroundColor: bg, borderColor, borderRadius: size / 2, height: size, width: size },
        ]}
      >
        <Feather color={active ? theme.colors.primary : theme.colors.textMuted} name="user" size={size * 0.45} />
      </View>
    );
  }

  const initials = getInitials(label);

  return (
    <View
      style={[styles.fallback, { backgroundColor: bg, borderColor, borderRadius: size / 2, height: size, width: size }]}
    >
      <Text style={[styles.initials, { color: theme.colors.textPrimary, fontSize: size * 0.36 }]}>{initials}</Text>
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
    ...typography.displayBold,
    letterSpacing: -0.4,
  },
});
