import { Image, StyleSheet, Text, View } from 'react-native';
import { getInitials } from '@/features/discovery/lib/mobileFormatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type ProfileAvatarProps = {
  active?: boolean;
  imageUrl?: string | null;
  label?: string | null;
  size?: number;
};

export function ProfileAvatar({ active = false, imageUrl, label, size = 30 }: ProfileAvatarProps) {
  const { theme } = useAppTheme();
  const borderColor = active ? theme.colors.primary : theme.colors.border;
  const initials = getInitials(label ?? 'Gatherle Member');

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
