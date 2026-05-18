import { ApolloError, useMutation } from '@apollo/client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { CreateUserDocument } from '@data/graphql/mutation/User/mutation';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { getApolloErrorCode, getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import { type FieldErrors, registerSchema, toFieldErrors } from '@/lib/auth/validation';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type RegisterRoute = RouteProp<RootStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<RegisterRoute>();
  const { isAuthenticated, setPendingVerificationEmail } = useAppShell();
  const { theme } = useAppTheme();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [values, setValues] = useState({
    birthdate: '',
    email: '',
    family_name: '',
    given_name: '',
    password: '',
  });
  const [createUser, { loading }] = useMutation(CreateUserDocument);
  const redirectTab = route.params?.redirectTab;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: redirectTab ?? 'Account' } }],
    });
  }, [isAuthenticated, navigation, redirectTab]);

  const actionsDisabled = useMemo(
    () => Object.values(values).some((value) => !value.trim()) || loading,
    [loading, values],
  );

  if (isAuthenticated) {
    return null;
  }

  const handleChange = (field: keyof typeof values, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse({
      ...values,
      birthdate: values.birthdate.trim(),
      email: values.email.trim().toLowerCase(),
      family_name: values.family_name.trim(),
      given_name: values.given_name.trim(),
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    try {
      const response = await createUser({
        variables: {
          input: parsed.data,
        },
      });

      const createdUser = response.data?.createUser;
      if (!createdUser) {
        setFormError('Registration failed. Please try again.');
        return;
      }

      setPendingVerificationEmail(createdUser.email);
      navigation.replace('VerifyPending', {
        email: createdUser.email,
        redirectTab,
      });
    } catch (error) {
      const apolloError = error as ApolloError;
      if (getApolloErrorCode(apolloError) === 'CONFLICT') {
        setFormError('An account with this email address already exists.');
        return;
      }

      setFormError(getApolloErrorMessage(apolloError) ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <AuthScreenShell subtitle="Join Gatherle to discover, host, and follow great events." title="Create your account">
      <View style={styles.form}>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <AuthFormField
              autoCapitalize="words"
              autoComplete="name"
              error={fieldErrors.given_name?.[0]}
              label="First name"
              onChangeText={(value) => handleChange('given_name', value)}
              placeholder="Jeff"
              textContentType="givenName"
              value={values.given_name}
            />
          </View>
          <View style={styles.halfField}>
            <AuthFormField
              autoCapitalize="words"
              autoComplete="name"
              error={fieldErrors.family_name?.[0]}
              label="Last name"
              onChangeText={(value) => handleChange('family_name', value)}
              placeholder="Bezos"
              textContentType="familyName"
              value={values.family_name}
            />
          </View>
        </View>
        <AuthFormField
          autoComplete="email"
          error={fieldErrors.email?.[0]}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => handleChange('email', value)}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={values.email}
        />
        <AuthFormField
          autoComplete="new-password"
          error={fieldErrors.password?.[0]}
          label="Password"
          onChangeText={(value) => handleChange('password', value)}
          placeholder="Create a strong password"
          secureTextEntry
          textContentType="newPassword"
          value={values.password}
        />
        <AuthFormField
          autoComplete="birthdate-full"
          error={fieldErrors.birthdate?.[0]}
          label="Date of birth"
          onChangeText={(value) => handleChange('birthdate', value)}
          placeholder="YYYY-MM-DD"
          textContentType="birthdate"
          value={values.birthdate}
        />

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
            {loading ? 'Signing up...' : 'Sign up'}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerCopy, { color: theme.colors.textSecondary }]}>Already a member?</Text>
          <Pressable onPress={() => navigation.replace('Login', redirectTab ? { redirectTab } : undefined)}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Log in here</Text>
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
  halfField: {
    flex: 1,
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
