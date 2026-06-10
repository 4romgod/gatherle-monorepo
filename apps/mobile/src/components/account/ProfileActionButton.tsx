import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';
import { profileCompactTextProps, profileMetrics } from '@/lib/account/profileMetrics';

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
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Feather color={theme.colors.textPrimary} name={icon} size={profileMetrics.actionButtonIconSize} />
      <Text
        numberOfLines={1}
        style={[styles.profileActionButtonText, { color: theme.colors.textPrimary }]}
        {...profileCompactTextProps}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileActionButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: profileMetrics.actionButtonGap,
    justifyContent: 'center',
    minHeight: profileMetrics.actionButtonMinHeight,
    minWidth: 0,
    paddingHorizontal: profileMetrics.actionButtonPaddingHorizontal,
  },
  profileActionButtonText: {
    ...typography.bodySemiBold,
    flexShrink: 1,
    fontSize: profileMetrics.actionButtonLabelSize,
  },
});
