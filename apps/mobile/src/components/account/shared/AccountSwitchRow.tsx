import { StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type AccountSwitchRowProps = {
  description?: string;
  onValueChange: (value: boolean) => void;
  title: string;
  value: boolean;
};

export function AccountSwitchRow({ description, onValueChange, title, value }: AccountSwitchRowProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? theme.colors.primaryContrast : theme.colors.surface}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 19,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
});
