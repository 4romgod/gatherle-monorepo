import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type HeaderIconButtonProps = {
  accessibilityLabel: string;
  badgeCount?: number;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  size?: number;
  tintColor?: string;
};

export function HeaderIconButton({
  accessibilityLabel,
  badgeCount = 0,
  icon,
  onPress,
  size = 22,
  tintColor,
}: HeaderIconButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.64 : 1 }]}
    >
      <Feather color={tintColor ?? theme.colors.primary} name={icon} size={size} />
      {badgeCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.badgeText, { color: theme.colors.primaryContrast }]}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    right: 1,
    top: 1,
  },
  badgeText: {
    ...typography.bodyBold,
    fontSize: 10,
    lineHeight: 11,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 40,
  },
});
