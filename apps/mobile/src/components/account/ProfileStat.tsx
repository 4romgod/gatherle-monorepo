import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';
import { profileCompactTextProps, profileMetrics } from '@/lib/account/profileMetrics';

type ProfileStatProps = {
  label: string;
  onPress?: () => void;
  value: string;
};

export function ProfileStat({ label, onPress, value }: ProfileStatProps) {
  const { theme } = useAppTheme();

  const content = (
    <>
      <Text
        numberOfLines={1}
        style={[styles.profileStatValue, { color: theme.colors.textPrimary }]}
        {...profileCompactTextProps}
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.profileStatLabel, { color: theme.colors.textSecondary }]}
        {...profileCompactTextProps}
      >
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.profileStat}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.profileStat, pressed ? styles.profileStatPressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileStat: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    flex: 1,
    gap: 2,
    minHeight: profileMetrics.statMinHeight,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: profileMetrics.statPaddingHorizontal,
    paddingVertical: profileMetrics.statPaddingVertical,
  },
  profileStatLabel: {
    ...typography.bodyRegular,
    flexShrink: 1,
    fontSize: profileMetrics.statLabelSize,
    textAlign: 'center',
    width: '100%',
  },
  profileStatPressed: {
    opacity: 0.72,
  },
  profileStatValue: {
    ...typography.displayBold,
    fontSize: profileMetrics.statValueSize,
    letterSpacing: -0.5,
  },
});
