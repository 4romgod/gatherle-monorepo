import { AntDesign, Feather } from '@expo/vector-icons';
import { ApolloError, useMutation } from '@apollo/client';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { LoginWithOAuthDocument } from '@data/graphql/mutation/User/mutation';
import { OAuthProvider } from '@data/graphql/types/graphql';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePushNotifications } from '@/app/providers/PushNotificationsProvider';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { signInWithApple, type AppleOAuthIdentity } from '@/lib/auth/appleSignIn';
import { getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import {
  configureMobileGoogleSignIn,
  getGoogleSignInDeveloperErrorMessage,
  getGoogleSignInUnavailableMessage,
  isGoogleSignInConfiguredForPlatform,
} from '@/lib/auth/googleSignIn';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type LoginRoute = RouteProp<RootStackParamList, 'Login'>;

const GOOGLE_DEVELOPER_ERROR_CODE = '10';

type ProviderOptionProps = {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onPress: () => void;
};

function ProviderOption({ disabled = false, icon, label, onPress }: ProviderOptionProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerButton,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.providerIconWrap}>{icon}</View>
      <Text style={[styles.providerLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function LoginProvidersScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<LoginRoute>();
  const { isAuthenticated, signIn } = useAppShell();
  const { hasPendingNotificationResponse } = usePushNotifications();
  const { theme } = useAppTheme();
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [loginWithOAuth] = useMutation(LoginWithOAuthDocument);
  const redirectTab = route.params?.redirectTab;
  const googleConfigured = isGoogleSignInConfiguredForPlatform();

  useEffect(() => {
    if (!isAuthenticated || hasPendingNotificationResponse) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: redirectTab ?? 'Account' } }],
    });
  }, [hasPendingNotificationResponse, isAuthenticated, navigation, redirectTab]);

  const openEmailLogin = () => {
    setProviderNotice(null);
    navigation.navigate('EmailLogin', redirectTab ? { redirectTab } : undefined);
  };

  const completeOAuthLogin = async ({
    provider,
    identity,
  }: {
    provider: OAuthProvider;
    identity: AppleOAuthIdentity & { profile_picture?: string | null };
  }) => {
    const response = await loginWithOAuth({
      variables: {
        input: {
          idToken: identity.idToken,
          provider,
          ...(identity.email ? { email: identity.email } : {}),
          ...(identity.given_name ? { given_name: identity.given_name } : {}),
          ...(identity.family_name ? { family_name: identity.family_name } : {}),
          ...(identity.profile_picture ? { profile_picture: identity.profile_picture } : {}),
        },
      },
    });

    if (!response.data?.loginWithOAuth) {
      throw new Error(`${provider} sign-in failed. Please try again.`);
    }

    signIn(response.data.loginWithOAuth);
    if (hasPendingNotificationResponse) {
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: redirectTab ?? 'Account' } }],
    });
  };

  const handleGoogleLogin = async () => {
    setProviderNotice(null);
    if (!googleConfigured) {
      setProviderNotice(getGoogleSignInUnavailableMessage());
      return;
    }

    setGoogleLoading(true);
    try {
      configureMobileGoogleSignIn();

      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === 'cancelled') {
        return;
      }

      const idToken = signInResult.data.idToken;
      if (!idToken) {
        setProviderNotice('Google did not return an identity token. Please try again.');
        return;
      }

      await completeOAuthLogin({
        identity: {
          idToken,
        },
        provider: OAuthProvider.Google,
      });
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.IN_PROGRESS) {
          setProviderNotice('Google sign-in is already in progress.');
          return;
        }

        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setProviderNotice('Google Play Services are unavailable or outdated on this device.');
          return;
        }

        if (error.code === GOOGLE_DEVELOPER_ERROR_CODE || error.message.includes('DEVELOPER_ERROR')) {
          setProviderNotice(getGoogleSignInDeveloperErrorMessage());
          return;
        }
      }

      setGoogleLoading(false);
      setProviderNotice(getApolloErrorMessage(error as ApolloError) ?? 'Google sign-in failed. Please try again.');
      return;
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setProviderNotice(null);
    setAppleLoading(true);

    try {
      const identity = await signInWithApple();
      if (!identity) {
        return;
      }

      await completeOAuthLogin({
        identity,
        provider: OAuthProvider.Apple,
      });
    } catch (error) {
      setProviderNotice(getApolloErrorMessage(error as ApolloError) ?? 'Apple sign-in failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthScreenShell
      subtitle="Manage your account, check notifications, comment on events, and more."
      title="Log in to Gatherle"
    >
      <View style={styles.optionsList}>
        <ProviderOption
          icon={<Feather color={theme.colors.textPrimary} name="mail" size={20} />}
          label="Use email and password"
          onPress={openEmailLogin}
        />
        <ProviderOption
          disabled={googleLoading}
          icon={<AntDesign color="#ea4335" name="google" size={20} />}
          label={googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          onPress={() => void handleGoogleLogin()}
        />
        <ProviderOption
          disabled={appleLoading}
          icon={<AntDesign color={theme.colors.textPrimary} name="apple" size={22} />}
          label={appleLoading ? 'Connecting to Apple...' : 'Continue with Apple'}
          onPress={() => void handleAppleLogin()}
        />
      </View>

      {providerNotice ? (
        <Text style={[styles.notice, { color: theme.colors.textSecondary }]}>{providerNotice}</Text>
      ) : null}

      <View style={styles.footerBlock}>
        <Text style={[styles.termsCopy, { color: theme.colors.textSecondary }]}>
          By continuing, you agree to our Terms of Service and acknowledge that you have read our Privacy Policy.
        </Text>
        <View style={styles.signUpRow}>
          <Text style={[styles.signUpCopy, { color: theme.colors.textSecondary }]}>Don&apos;t have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Register', redirectTab ? { redirectTab } : undefined)}>
            <Text style={[styles.signUpLink, { color: theme.colors.primary }]}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  footerBlock: {
    gap: 18,
    paddingTop: 8,
  },
  notice: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  optionsList: {
    gap: 14,
  },
  providerButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  providerIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  providerLabel: {
    ...typography.bodySemiBold,
    fontSize: 16,
  },
  signUpCopy: {
    ...typography.bodyRegular,
    fontSize: fontSize.lg,
  },
  signUpLink: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
  signUpRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  termsCopy: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 20,
    textAlign: 'center',
  },
});
