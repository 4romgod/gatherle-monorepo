import { AntDesign, Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type LoginRoute = RouteProp<RootStackParamList, 'Login'>;

type ProviderOptionProps = {
  icon: ReactNode;
  label: string;
  onPress: () => void;
};

function ProviderOption({ icon, label, onPress }: ProviderOptionProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerButton,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.92 : 1,
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
  const { isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
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

  const openEmailLogin = () => {
    setProviderNotice(null);
    navigation.navigate('EmailLogin', redirectTab ? { redirectTab } : undefined);
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
          icon={<AntDesign color="#ea4335" name="google" size={20} />}
          label="Continue with Google"
          onPress={() => setProviderNotice('Google sign-in UI is ready. OAuth wiring is the next step.')}
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
