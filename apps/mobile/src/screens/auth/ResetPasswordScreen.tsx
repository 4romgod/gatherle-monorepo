import { ApolloError, useMutation } from '@apollo/client';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { ResetPasswordDocument } from '@data/graphql/mutation/User/mutation';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { AuthStatusPanel } from '@/components/auth/AuthStatusPanel';
import { getApolloErrorCode, getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import { type FieldErrors, resetPasswordSchema, toFieldErrors } from '@/lib/auth/validation';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type ResetPasswordRoute = RouteProp<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<ResetPasswordRoute>();
  const { theme } = useAppTheme();
  const token = route.params?.token?.trim() ?? '';
  const redirectTab = route.params?.redirectTab;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [didReset, setDidReset] = useState(false);
  const [resetPassword, { loading }] = useMutation(ResetPasswordDocument);

  const handleSubmit = async () => {
    setFieldErrors({});
    setFormError(null);

    const parsed = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    if (!token) {
      setFormError('Reset token is missing. Please request a new link.');
      return;
    }

    try {
      await resetPassword({
        variables: {
          newPassword: parsed.data.password,
          token,
        },
      });
      setDidReset(true);
    } catch (error) {
      const apolloError = error as ApolloError;
      if (getApolloErrorCode(apolloError) === 'BAD_USER_INPUT') {
        setFormError('This reset link is invalid or has expired. Please request a new one.');
        return;
      }

      setFormError(getApolloErrorMessage(apolloError) ?? 'Failed to reset password. Please try again.');
    }
  };

  return (
    <AuthScreenShell subtitle="Choose a strong new password for your account." title="Set new password">
      {didReset ? (
        <AuthStatusPanel
          actionLabel="Go to login"
          description="Your password has been reset successfully. You can now log in with your new password."
          icon="check-circle"
          onPressAction={() => navigation.replace('Login', redirectTab ? { redirectTab } : undefined)}
          title="Password updated"
        />
      ) : !token ? (
        <AuthStatusPanel
          actionLabel="Request new link"
          description="This reset link is missing a token. Please request a new one."
          icon="alert-circle"
          onPressAction={() => navigation.replace('ForgotPassword', redirectTab ? { redirectTab } : undefined)}
          title="Invalid link"
          tone="error"
        />
      ) : (
        <View style={styles.form}>
          <AuthFormField
            autoComplete="new-password"
            error={fieldErrors.password?.[0]}
            label="New password"
            onChangeText={setPassword}
            placeholder="Enter a strong password"
            secureTextEntry
            textContentType="newPassword"
            value={password}
          />
          <AuthFormField
            autoComplete="new-password"
            error={fieldErrors.confirmPassword?.[0]}
            label="Confirm new password"
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            textContentType="newPassword"
            value={confirmPassword}
          />

          {formError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{formError}</Text> : null}

          <Pressable
            disabled={loading || !password.trim() || !confirmPassword.trim()}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.colors.secondary,
                opacity: loading || !password.trim() || !confirmPassword.trim() ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.primaryContrast }]}>
              {loading ? 'Saving...' : 'Set new password'}
            </Text>
          </Pressable>
        </View>
      )}
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  errorText: {
    ...typography.bodyMedium,
    fontSize: fontSize.md,
    lineHeight: 18,
  },
  form: {
    gap: 16,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});
