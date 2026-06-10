import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';
import { useMobileDeviceAccess } from '@/app/providers/MobileDeviceAccessProvider';
import { StateNotice } from './StateNotice';

function resolveGateCopy() {
  return {
    eyebrow: 'Access blocked',
    title: "This device can't use Gatherle right now",
    message: 'This installation has been blocked. Contact a Gatherle admin if you need it re-opened.',
    tone: 'error' as const,
  };
}

export function MobileDeviceAccessGate() {
  const { theme } = useAppTheme();
  const { deviceInstallationId, errorMessage, isCheckingAccess, refreshAccess } = useMobileDeviceAccess();

  if (isCheckingAccess) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingShell}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Checking device access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const copy = resolveGateCopy();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        <View style={styles.copyBlock}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{copy.eyebrow}</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Gatherle only closes native access when an admin explicitly blocks an installation.
          </Text>
        </View>

        <StateNotice
          actionLabel="Check again"
          message={errorMessage ?? copy.message}
          onPressAction={() => {
            void refreshAccess();
          }}
          tone={copy.tone}
          title="Device access"
        />

        {deviceInstallationId ? (
          <View
            style={[
              styles.installationCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.installationLabel, { color: theme.colors.textSecondary }]}>Installation ID</Text>
            <Text selectable style={[styles.installationValue, { color: theme.colors.textPrimary }]}>
              {deviceInstallationId}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  copyBlock: {
    gap: 10,
  },
  eyebrow: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  installationCard: {
    borderRadius: MOBILE_RADIUS.panel,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  installationLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  installationValue: {
    ...typography.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingShell: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    ...typography.bodyMedium,
    fontSize: 16,
  },
  safeArea: {
    flex: 1,
  },
  subtitle: {
    ...typography.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    ...typography.displayBold,
    fontSize: 30,
    letterSpacing: -1,
    lineHeight: 36,
  },
});
