import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
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
  autoComplete?: ComponentProps<typeof TextInput>['autoComplete'];
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  label: string;
  maxLength?: number;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onPressTrailingAction?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  trailingActionIcon?: ComponentProps<typeof Feather>['name'];
  trailingActionLabel?: string;
  textContentType?: ComponentProps<typeof TextInput>['textContentType'];
  value: string;
};

export function AccountTextField({
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  keyboardType = 'default',
  label,
  maxLength,
  multiline = false,
  onChangeText,
  onPressTrailingAction,
  placeholder,
  secureTextEntry = false,
  textContentType = 'none',
  trailingActionIcon,
  trailingActionLabel,
  value,
}: AccountTextFieldProps) {
  const { theme } = useAppTheme();
  const { handleFocus, inputRef } = useKeyboardAwareField();
  const hasTrailingAction = Boolean(trailingActionIcon && onPressTrailingAction);

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          multiline ? styles.inputWrapMultiline : null,
          hasTrailingAction ? styles.inputWrapWithAction : null,
          {
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          ref={inputRef}
          secureTextEntry={secureTextEntry}
          selectionColor={theme.colors.primary}
          style={[styles.input, multiline ? styles.inputMultiline : null, { color: theme.colors.textPrimary }]}
          textAlignVertical={multiline ? 'top' : 'center'}
          textContentType={textContentType}
          value={value}
        />
        {hasTrailingAction ? (
          <Pressable
            accessibilityLabel={trailingActionLabel}
            accessibilityRole="button"
            onPress={onPressTrailingAction}
            style={({ pressed }) => [styles.trailingAction, { opacity: pressed ? 0.72 : 1 }]}
          >
            <Feather color={theme.colors.textSecondary} name={trailingActionIcon!} size={18} />
          </Pressable>
        ) : null}
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
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWrapWithAction: {
    alignItems: 'center',
  },
  inputWrapMultiline: {
    minHeight: 132,
  },
  label: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  trailingAction: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
