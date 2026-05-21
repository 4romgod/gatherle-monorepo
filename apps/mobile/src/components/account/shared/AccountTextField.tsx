import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { useKeyboardAwareField } from '@/hooks/core/useKeyboardAwareField';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rn-account-input-no-outline';
  if (!document.getElementById(styleId)) {
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = 'input:focus, textarea:focus { outline: none !important; }';
    document.head.appendChild(el);
  }
}

type AccountTextFieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'birthdate-full' | 'email' | 'name' | 'off' | 'tel' | 'username';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  textContentType?:
    | 'emailAddress'
    | 'familyName'
    | 'givenName'
    | 'name'
    | 'none'
    | 'telephoneNumber'
    | 'username'
    | 'birthdate';
  value: string;
};

export function AccountTextField({
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  keyboardType = 'default',
  label,
  multiline = false,
  onChangeText,
  placeholder,
  textContentType = 'none',
  value,
}: AccountTextFieldProps) {
  const { theme } = useAppTheme();
  const { handleFocus, inputRef } = useKeyboardAwareField();

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          multiline ? styles.inputWrapMultiline : null,
          {
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          ref={inputRef}
          selectionColor={theme.colors.primary}
          style={[styles.input, multiline ? styles.inputMultiline : null, { color: theme.colors.textPrimary }]}
          textAlignVertical={multiline ? 'top' : 'center'}
          textContentType={textContentType}
          value={value}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    gap: 8,
  },
  input: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: 15,
    minHeight: 22,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 104,
  },
  inputWrap: {
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWrapMultiline: {
    minHeight: 132,
  },
  label: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
});
