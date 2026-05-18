import { ApolloError, useMutation } from '@apollo/client';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { RequestEmailVerificationDocument } from '@data/graphql/mutation/User/mutation';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import { type FieldErrors, forgotPasswordSchema, toFieldErrors } from '@/lib/auth/validation';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type VerifyPendingRoute = RouteProp<RootStackParamList, 'VerifyPending'>;

export function VerifyPendingScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<VerifyPendingRoute>();
  const { pendingVerificationEmail, setPendingVerificationEmail } = useAppShell();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState(route.params?.email ?? pendingVerificationEmail ?? '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [didSend, setDidSend] = useState(false);
  const [requestVerification, { loading }] = useMutation(RequestEmailVerificationDocument);

  useEffect(() => {
    if (!pendingVerificationEmail && route.params?.email) {
      setPendingVerificationEmail(route.params.email);
    }
  }, [pendingVerificationEmail, route.params?.email, setPendingVerificationEmail]);

  const effectiveEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSubmit = async () => {
    setFieldErrors({});
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({
      email: effectiveEmail,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    try {
      await requestVerification({
        variables: {
          email: parsed.data.email,
        },
      });

      setPendingVerificationEmail(parsed.data.email);
      setDidSend(true);
    } catch (error) {
      setFormError(
        getApolloErrorMessage(error as ApolloError) ?? 'Failed to send verification email. Please try again.',
      );
    }
  };

  return (
    <AuthScreenShell subtitle="Check your inbox and click the verification link we sent you." title="Verify your email">
      {pendingVerificationEmail || didSend ? (
        <View style={styles.content}>
          <Text style={[styles.leadCopy, { color: theme.colors.textSecondary }]}>
            We've sent a verification link to
          </Text>
          <Text style={[styles.emailLabel, { color: theme.colors.textPrimary }]}>
            {pendingVerificationEmail ?? effectiveEmail}
          </Text>
          <Text style={[styles.bodyCopy, { color: theme.colors.textSecondary }]}>
            Click the link in the email to verify your account. The link expires in 24 hours.
          </Text>

          {formError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{formError}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: theme.colors.border,
                opacity: loading ? 0.6 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
              {loading ? 'Sending...' : 'Resend verification email'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={[styles.bodyCopy, { color: theme.colors.textSecondary }]}>
            Enter your email address below and we'll send you a new verification link.
          </Text>
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
            disabled={loading || !effectiveEmail}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.colors.secondary,
                opacity: loading || !effectiveEmail ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.primaryContrast }]}>
              {loading ? 'Sending...' : 'Send verification email'}
            </Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={[styles.footerCopy, { color: theme.colors.textSecondary }]}>Don&apos;t have an account?</Text>
            <Pressable
              onPress={() =>
                navigation.replace(
                  'Register',
                  route.params?.redirectTab ? { redirectTab: route.params.redirectTab } : undefined,
                )
              }
            >
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Register here</Text>
            </Pressable>
          </View>
        </View>
      )}
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  bodyCopy: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  emailLabel: {
    ...typography.bodyBold,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodyMedium,
    fontSize: fontSize.md,
    lineHeight: 18,
    textAlign: 'center',
  },
  footerCopy: {
    ...typography.bodyRegular,
    fontSize: fontSize.lg,
  },
  footerLink: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  form: {
    gap: 16,
  },
  leadCopy: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
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
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
    width: '100%',
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});
