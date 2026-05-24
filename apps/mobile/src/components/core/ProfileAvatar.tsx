import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { RemoteImage } from '@/components/core/RemoteImage';

type ProfileAvatarProps = {
  active?: boolean;
  imageUrl?: string | null;
  label?: string | null;
  size?: number;
};

export function ProfileAvatar({ active = false, imageUrl, label, size = 30 }: ProfileAvatarProps) {
  const { theme } = useAppTheme();
  const borderColor = active ? theme.colors.primary : theme.colors.border;
  const bg = active ? theme.colors.primarySoft : theme.colors.surfaceMuted;

  const initials = getInitials(label ?? '');
  const fallback = (
    <View
      style={[
        styles.innerFallback,
        {
          backgroundColor: bg,
          borderRadius: Math.max(size / 2 - 2, 0),
          height: size - 4,
          width: size - 4,
        },
      ]}
    >
      {label ? (
        <Text style={[styles.initials, { color: theme.colors.textPrimary, fontSize: size * 0.36 }]}>{initials}</Text>
      ) : (
        <Feather color={active ? theme.colors.primary : theme.colors.textMuted} name="user" size={size * 0.45} />
      )}
    </View>
  );

  return (
    <View style={[styles.frame, { borderColor, borderRadius: size / 2, height: size, width: size }]}>
      <RemoteImage
        imageStyle={{ borderRadius: Math.max(size / 2 - 2, 0) }}
        uri={imageUrl}
        style={{ borderRadius: Math.max(size / 2 - 2, 0), height: size - 4, width: size - 4 }}
        fallback={fallback}
      />
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
  innerFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.displayBold,
    letterSpacing: -0.4,
  },
});
