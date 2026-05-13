import { ApolloError, useMutation } from '@apollo/client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { LoginUserDocument } from '@data/graphql/mutation/User/mutation';
import { AuthFormField } from '@/features/auth/components/AuthFormField';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { getApolloErrorMessage } from '@/features/auth/lib/apolloErrors';
import { type FieldErrors, loginSchema, toFieldErrors } from '@/features/auth/lib/validation';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type EmailLoginRoute = RouteProp<RootStackParamList, 'EmailLogin'>;

export function LoginScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<EmailLoginRoute>();
  const { isAuthenticated, signIn } = useAppShell();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loginUser, { loading }] = useMutation(LoginUserDocument);
  const redirectTab = route.params?.redirectTab ?? 'Home';

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: redirectTab } }],
    });
  }, [isAuthenticated, navigation, redirectTab]);

  const actionsDisabled = useMemo(() => !email.trim() || !password.trim() || loading, [email, password, loading]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    try {
      const response = await loginUser({
        variables: {
          input: parsed.data,
        },
      });

      if (!response.data?.loginUser) {
        setFormError('Login failed. Please try again.');
        return;
      }

      signIn(response.data.loginUser);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: redirectTab } }],
      });
    } catch (error) {
      setFormError(getApolloErrorMessage(error as ApolloError) ?? 'Login failed. Please try again.');
    }
  };

  return (
    <AuthScreenShell subtitle="Sign in to your account to continue." title="Welcome back">
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
        <AuthFormField
          autoComplete="current-password"
          error={fieldErrors.password?.[0]}
          label="Password"
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          textContentType="password"
          value={password}
        />

        <Pressable onPress={() => navigation.navigate('ForgotPassword', { redirectTab })} style={styles.linkWrap}>
          <Text style={[styles.singleLink, { color: theme.colors.primary }]}>Forgot password?</Text>
        </Pressable>

        {formError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{formError}</Text> : null}

        <Pressable
          disabled={actionsDisabled}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.colors.secondary,
              opacity: actionsDisabled ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.primaryContrast }]}>
            {loading ? 'Logging in...' : 'Log in'}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerCopy, { color: theme.colors.textSecondary }]}>Don&apos;t have an account?</Text>
          <Pressable onPress={() => navigation.replace('Register', { redirectTab })}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  errorText: {
    ...typography.bodyMedium,
    fontSize: fontSize.md,
    lineHeight: 18,
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
  linkWrap: {
    alignSelf: 'flex-start',
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
  singleLink: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
});
