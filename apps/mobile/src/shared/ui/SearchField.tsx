import { Feather } from '@expo/vector-icons';
import { TextInput, View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type SearchFieldProps = {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchField({ onChangeText, placeholder, value }: SearchFieldProps) {
  const { theme } = useAppTheme();
  const elevatedShadow =
    theme.mode === 'light'
      ? {
          elevation: 4,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }
      : null;

  return (
    <View
      style={[
        styles.container,
        elevatedShadow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Feather color={theme.colors.textMuted} name="search" size={24} />
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        returnKeyType="search"
        style={[styles.input, { color: theme.colors.textPrimary }]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 20,
  },
  input: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
