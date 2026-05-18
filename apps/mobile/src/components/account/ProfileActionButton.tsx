import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type ProfileActionButtonProps = {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
};

export function ProfileActionButton({ icon, label, onPress }: ProfileActionButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileActionButton,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Feather color={theme.colors.textPrimary} name={icon} size={14} />
      <Text style={[styles.profileActionButtonText, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileActionButton: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  profileActionButtonText: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
});
