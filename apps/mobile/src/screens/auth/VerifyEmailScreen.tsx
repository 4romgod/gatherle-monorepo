import { ApolloError, useMutation } from '@apollo/client';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { VerifyEmailDocument } from '@data/graphql/mutation/User/mutation';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { AuthStatusPanel } from '@/components/auth/AuthStatusPanel';
import { getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type VerifyEmailRoute = RouteProp<RootStackParamList, 'VerifyEmail'>;
type VerifyStatus = 'error' | 'success' | 'verifying';

export function VerifyEmailScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<VerifyEmailRoute>();
  const { theme } = useAppTheme();
  const token = route.params?.token?.trim();
  const redirectTab = route.params?.redirectTab;
  const [status, setStatus] = useState<VerifyStatus>(token ? 'verifying' : 'error');
  const [errorMessage, setErrorMessage] = useState('No verification token was provided. Please request a new link.');
  const [verifyEmail] = useMutation(VerifyEmailDocument);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    verifyEmail({
      variables: {
        token,
      },
    })
      .then(() => {
        setStatus('success');
      })
      .catch((error: ApolloError) => {
        setStatus('error');
        setErrorMessage(
          getApolloErrorMessage(error) ?? 'This verification link is invalid or has expired. Please request a new one.',
        );
      });
  }, [token, verifyEmail]);

  return (
    <AuthScreenShell subtitle="We're validating your email verification link." title="Verify your email">
      {status === 'verifying' ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={[styles.loadingTitle, { color: theme.colors.textPrimary }]}>Verifying your email...</Text>
        </View>
      ) : status === 'success' ? (
        <AuthStatusPanel
          actionLabel="Go to login"
          description="Your email address has been verified. You can now log in."
          icon="check-circle"
          onPressAction={() => navigation.replace('Login', redirectTab ? { redirectTab } : undefined)}
          title="Email verified!"
        />
      ) : (
        <AuthStatusPanel
          actionLabel="Request a new link"
          description={errorMessage}
          icon="alert-circle"
          onPressAction={() => navigation.replace('VerifyPending', redirectTab ? { redirectTab } : undefined)}
          title="Verification failed"
          tone="error"
        />
      )}
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: 'center',
    gap: 14,
    justifyContent: 'center',
    minHeight: 220,
  },
  loadingTitle: {
    ...typography.displayBold,
    fontSize: fontSize.xl2,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});
