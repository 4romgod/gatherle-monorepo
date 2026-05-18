import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type AccountTabButtonProps = {
  active: boolean;
  icon: ComponentProps<typeof Feather>['name'];
  onPress: () => void;
};

export function AccountTabButton({ active, icon, onPress }: AccountTabButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountTabButton,
        {
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconFrame,
          active
            ? {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }
            : null,
        ]}
      >
        <Feather color={active ? theme.colors.primary : theme.colors.textSecondary} name={icon} size={24} />
      </View>
      <View
        style={[
          styles.activeIndicator,
          {
            backgroundColor: active ? theme.colors.primary : 'transparent',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accountTabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 56,
    paddingTop: 4,
    position: 'relative',
  },
  activeIndicator: {
    borderRadius: 999,
    height: 3,
    width: 44,
  },
  iconFrame: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
