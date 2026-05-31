import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

// Inject a global CSS rule once on web to strip the browser focus outline from
// all TextInput elements (which render as <input> or <textarea> in RN Web).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rn-input-no-outline';
  if (!document.getElementById(styleId)) {
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = 'input:focus, textarea:focus { outline: none !important; }';
    document.head.appendChild(el);
  }
}

type SearchFieldProps = {
  autoFocus?: boolean;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  value: string;
};

export function SearchField({ autoFocus = false, onChangeText, onClear, placeholder, value }: SearchFieldProps) {
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
      <Feather color={theme.colors.textMuted} name="search" size={18} />
      <TextInput
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        returnKeyType="search"
        style={[styles.input, { color: theme.colors.textPrimary }]}
        value={value}
      />
      {value.length > 0 && onClear ? (
        <Pressable
          hitSlop={8}
          onPress={onClear}
          style={[styles.clearButton, { backgroundColor: theme.colors.textMuted }]}
        >
          <Feather color={theme.colors.surface} name="x" size={11} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  container: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  input: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
