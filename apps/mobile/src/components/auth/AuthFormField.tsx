import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { useKeyboardAwareField } from '@/hooks/core/useKeyboardAwareField';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rn-auth-input-no-outline';
  if (!document.getElementById(styleId)) {
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = 'input:focus, textarea:focus { outline: none !important; }';
    document.head.appendChild(el);
  }
}

type AuthFormFieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'birthdate-full' | 'current-password' | 'email' | 'name' | 'new-password' | 'off' | 'username';
  error?: string;
  keyboardType?: 'default' | 'email-address';
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  returnKeyType?: 'default' | 'done' | 'go' | 'next' | 'search' | 'send';
  secureTextEntry?: boolean;
  textContentType?:
    | 'emailAddress'
    | 'givenName'
    | 'familyName'
    | 'name'
    | 'none'
    | 'password'
    | 'newPassword'
    | 'username'
    | 'birthdate';
  value: string;
};

export function AuthFormField({
  autoCapitalize = 'none',
  autoComplete = 'off',
  error,
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  returnKeyType = 'next',
  secureTextEntry = false,
  textContentType = 'none',
  value,
}: AuthFormFieldProps) {
  const { theme } = useAppTheme();
  const [showSecret, setShowSecret] = useState(false);
  const shouldMask = secureTextEntry && !showSecret;
  const { handleFocus, inputRef } = useKeyboardAwareField();

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
          },
        ]}
      >
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          ref={inputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={shouldMask}
          selectionColor={theme.colors.primary}
          style={[styles.input, { color: theme.colors.textPrimary }]}
          textContentType={textContentType}
          value={value}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={showSecret ? 'Hide password' : 'Show password'}
            onPress={() => setShowSecret((current) => !current)}
            style={styles.iconButton}
          >
            <Feather color={theme.colors.textMuted} name={showSecret ? 'eye-off' : 'eye'} size={18} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    ...typography.bodyMedium,
    fontSize: fontSize.md,
    lineHeight: 16,
  },
  fieldBlock: {
    gap: 6,
  },
  iconButton: {
    paddingVertical: 2,
  },
  input: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: 15,
    minHeight: 22,
    padding: 0,
  },
  inputWrap: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  label: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
});
