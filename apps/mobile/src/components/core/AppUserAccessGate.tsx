import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { StateNotice } from './StateNotice';

type AppUserAccessGateProps = {
  message: string;
  onContinue: () => void;
};

export function AppUserAccessGate({ message, onContinue }: AppUserAccessGateProps) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        <View style={styles.copyBlock}>
          <Text style={[styles.eyebrow, { color: theme.colors.error }]}>Account blocked</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            This account can&apos;t keep using Gatherle
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Signed-in access has been removed for this account. If you think this is a mistake, contact a Gatherle
            admin.
          </Text>
        </View>

        <StateNotice
          actionLabel="Continue signed out"
          message={message}
          onPressAction={onContinue}
          tone="error"
          title="Account status"
        />
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
