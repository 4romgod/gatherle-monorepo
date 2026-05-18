import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type ProfileStatProps = {
  label: string;
  value: string;
};

export function ProfileStat({ label, value }: ProfileStatProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.profileStat}>
      <Text numberOfLines={1} style={[styles.profileStatValue, { color: theme.colors.textPrimary }]}>
        {value}
      </Text>
      <Text numberOfLines={1} style={[styles.profileStatLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileStat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  profileStatLabel: {
    ...typography.bodyRegular,
    fontSize: 12,
    textAlign: 'center',
  },
  profileStatValue: {
    ...typography.displayBold,
    fontSize: 21,
    letterSpacing: -0.5,
  },
});
