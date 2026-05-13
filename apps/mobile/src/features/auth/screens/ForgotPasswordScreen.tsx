import { ApolloError, useMutation } from '@apollo/client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ForgotPasswordDocument } from '@data/graphql/mutation/User/mutation';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { AuthFormField } from '@/features/auth/components/AuthFormField';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { AuthStatusPanel } from '@/features/auth/components/AuthStatusPanel';
import { getApolloErrorMessage } from '@/features/auth/lib/apolloErrors';
import { type FieldErrors, forgotPasswordSchema, toFieldErrors } from '@/features/auth/lib/validation';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type ForgotPasswordRoute = RouteProp<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<ForgotPasswordRoute>();
  const { theme } = useAppTheme();
  const redirectTab = route.params?.redirectTab;
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [forgotPassword, { loading }] = useMutation(ForgotPasswordDocument);

  const handleSubmit = async () => {
    setFieldErrors({});
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({
      email: email.trim().toLowerCase(),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    try {
      await forgotPassword({
        variables: {
          email: parsed.data.email,
        },
      });
      setRequestSent(true);
    } catch (error) {
      setFormError(getApolloErrorMessage(error as ApolloError) ?? 'Failed to send reset email. Please try again.');
    }
  };

  return (
    <AuthScreenShell
      subtitle="Enter your email address and we'll send you a password reset link."
      title="Reset your password"
    >
      {requestSent ? (
        <AuthStatusPanel
          actionLabel="Back to login"
          description="If an account exists for that email address, we've sent a password reset link. The link expires in 1 hour."
          icon="mail"
          onPressAction={() => navigation.replace('Login', redirectTab ? { redirectTab } : undefined)}
          title="Check your inbox"
        />
      ) : (
        <View style={styles.form}>
          <AuthFormField
            autoComplete="email"
            error={fieldErrors.email?.[0]}
            keyboardType="email-address"
            label="Email address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            textContentType="emailAddress"
            value={email}
          />

          {formError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{formError}</Text> : null}

          <Pressable
            disabled={loading || !email.trim()}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.colors.secondary,
                opacity: loading || !email.trim() ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.primaryContrast }]}>
              {loading ? 'Sending...' : 'Send reset link'}
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
