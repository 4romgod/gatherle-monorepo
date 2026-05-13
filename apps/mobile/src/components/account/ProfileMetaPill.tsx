import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type ProfileMetaPillProps = {
  value: string;
};

export function ProfileMetaPill({ value }: ProfileMetaPillProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.profileMetaPill,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text numberOfLines={1} style={[styles.profileMetaPillText, { color: theme.colors.textSecondary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileMetaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profileMetaPillText: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
});
