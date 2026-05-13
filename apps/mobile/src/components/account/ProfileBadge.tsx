import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export type ProfileBadgeTone = 'primary' | 'secondary' | 'success';

export type ProfileBadgeModel = {
  description?: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  tone?: ProfileBadgeTone;
};

type ProfileBadgeProps = {
  badge: ProfileBadgeModel;
};

export function ProfileBadge({ badge }: ProfileBadgeProps) {
  const { theme } = useAppTheme();
  const tone = badge.tone ?? 'primary';
  const palette =
    tone === 'secondary'
      ? {
          gradient: [theme.colors.secondary, '#ffb06d'] as const,
          iconColor: theme.colors.primaryContrast,
          shadowColor: theme.colors.secondary,
        }
      : tone === 'success'
        ? {
            gradient: [theme.colors.success, '#6ee7b7'] as const,
            iconColor: theme.colors.primaryContrast,
            shadowColor: theme.colors.success,
          }
        : {
            gradient: [theme.colors.primary, '#8b7fff'] as const,
            iconColor: theme.colors.primaryContrast,
            shadowColor: theme.colors.primary,
          };

  const handlePress = () => {
    Alert.alert(badge.label, badge.description ?? `${badge.label} badge`);
  };

  return (
    <Pressable
      accessibilityHint={badge.description ?? `${badge.label} badge`}
      accessibilityLabel={badge.label}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.badgeWrap,
        {
          opacity: pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <LinearGradient
        colors={palette.gradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[
          styles.badge,
          {
            shadowColor: palette.shadowColor,
          },
        ]}
      >
        <MaterialCommunityIcons color={palette.iconColor} name={badge.icon} size={13} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 8,
    height: 22,
    justifyContent: 'center',
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    width: 22,
  },
  badgeWrap: {
    borderRadius: 8,
  },
});
