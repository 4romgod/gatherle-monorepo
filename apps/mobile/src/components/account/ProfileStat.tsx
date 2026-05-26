import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type ProfileStatProps = {
  label: string;
  onPress?: () => void;
  value: string;
};

export function ProfileStat({ label, onPress, value }: ProfileStatProps) {
  const { theme } = useAppTheme();

  const content = (
    <>
      <Text numberOfLines={1} style={[styles.profileStatValue, { color: theme.colors.textPrimary }]}>
        {value}
      </Text>
      <Text numberOfLines={1} style={[styles.profileStatLabel, { color: theme.colors.textSecondary }]}>
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
    borderRadius: 14,
    flex: 1,
    gap: 2,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  profileStatLabel: {
    ...typography.bodyRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  profileStatPressed: {
    opacity: 0.72,
  },
  profileStatValue: {
    ...typography.displayBold,
    fontSize: 21,
    letterSpacing: -0.5,
  },
});
