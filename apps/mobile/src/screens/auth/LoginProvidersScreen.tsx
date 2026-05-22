import { AntDesign, Feather } from '@expo/vector-icons';
import { ApolloError, useMutation } from '@apollo/client';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { LoginWithOAuthDocument } from '@data/graphql/mutation/User/mutation';
import { OAuthProvider } from '@data/graphql/types/graphql';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
import { getApolloErrorMessage } from '@/lib/auth/apolloErrors';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

WebBrowser.maybeCompleteAuthSession();

type LoginRoute = RouteProp<RootStackParamList, 'Login'>;

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_FALLBACK_CLIENT_ID = GOOGLE_WEB_CLIENT_ID ?? GOOGLE_ANDROID_CLIENT_ID ?? GOOGLE_IOS_CLIENT_ID;
const GOOGLE_PLACEHOLDER_CLIENT_ID = 'missing-google-client-id';

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
  const { theme } = useAppTheme();
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const exchangedGoogleTokenRef = useRef<string | null>(null);
  const [loginWithOAuth] = useMutation(LoginWithOAuthDocument);
  const redirectTab = route.params?.redirectTab;
  const googleConfigured = Boolean(GOOGLE_FALLBACK_CLIENT_ID);
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    clientId: GOOGLE_FALLBACK_CLIENT_ID ?? GOOGLE_PLACEHOLDER_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: redirectTab ?? 'Account' } }],
    });
  }, [isAuthenticated, navigation, redirectTab]);

  const openEmailLogin = () => {
    setProviderNotice(null);
    navigation.navigate('EmailLogin', redirectTab ? { redirectTab } : undefined);
  };

  useEffect(() => {
    if (!googleResponse) {
      return;
    }

    if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      setGoogleLoading(false);
      return;
    }

    if (googleResponse.type !== 'success') {
      setGoogleLoading(false);
      setProviderNotice('Google sign-in was not completed.');
      return;
    }

    const idToken = googleResponse.authentication?.idToken ?? googleResponse.params.id_token;
    if (!idToken) {
      setGoogleLoading(false);
      setProviderNotice('Google did not return an identity token. Please try again.');
      return;
    }

    if (exchangedGoogleTokenRef.current === idToken) {
      return;
    }
    exchangedGoogleTokenRef.current = idToken;

    const exchangeGoogleIdentity = async () => {
      try {
        const response = await loginWithOAuth({
          variables: {
            input: {
              idToken,
              provider: OAuthProvider.Google,
            },
          },
        });

        if (!response.data?.loginWithOAuth) {
          setProviderNotice('Google sign-in failed. Please try again.');
          return;
        }

        signIn(response.data.loginWithOAuth);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: redirectTab ?? 'Account' } }],
        });
      } catch (error) {
        exchangedGoogleTokenRef.current = null;
        setProviderNotice(getApolloErrorMessage(error as ApolloError) ?? 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    };

    void exchangeGoogleIdentity();
  }, [googleResponse, loginWithOAuth, navigation, redirectTab, signIn]);

  const handleGoogleLogin = async () => {
    setProviderNotice(null);
    if (!googleConfigured) {
      setProviderNotice('Google sign-in is not configured for this build.');
      return;
    }

    if (!googleRequest) {
      setProviderNotice('Google sign-in is still loading. Please try again.');
      return;
    }

    setGoogleLoading(true);
    try {
      await promptGoogleAsync();
    } catch {
      setGoogleLoading(false);
      setProviderNotice('Google sign-in could not be opened. Please try again.');
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
          icon={<AntDesign color={theme.colors.textPrimary} name="apple" size={22} />}
          label="Continue with Apple"
          onPress={() => setProviderNotice('Apple sign-in UI is ready. OAuth wiring is the next step.')}
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
