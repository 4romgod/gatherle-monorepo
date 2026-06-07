import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTheme, darkTheme, lightTheme } from '@/app/theme/palette';
import { fontSize, typography } from '@/app/theme/typography';

type AppCrashScreenProps = {
  isDark: boolean;
  onRetry: () => void;
};

function resolveTheme(isDark: boolean): AppTheme {
  return isDark ? darkTheme : lightTheme;
}

export function AppCrashScreen({ isDark, onRetry }: AppCrashScreenProps) {
  const theme = resolveTheme(isDark);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.colors.heroGradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View
          style={[
            styles.statusPill,
            { backgroundColor: theme.colors.heroCard, borderColor: theme.colors.heroCardBorder },
          ]}
        >
          <Text style={[styles.statusPillText, { color: theme.colors.heroText }]}>Unexpected error</Text>
        </View>
        <Text style={[styles.statusCode, { color: theme.colors.heroText }]}>500</Text>
        <View style={styles.copyBlock}>
          <Text style={[styles.title, { color: theme.colors.heroText }]}>Something went wrong</Text>
          <Text style={[styles.message, { color: theme.colors.heroSubtle }]}>
            Gatherle hit an unexpected problem. Try again now. If it keeps happening, close and reopen the app in a few
            minutes.
          </Text>
        </View>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Recovery</Text>
        <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>
          Try again to reload the app. If this keeps happening, close Gatherle and reopen it in a few minutes.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: theme.colors.secondary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.secondaryContrast }]}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  hero: {
    borderRadius: 28,
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusPillText: {
    ...typography.bodyBold,
    fontSize: fontSize.sm,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statusCode: {
    ...typography.displayBold,
    fontSize: 56,
    letterSpacing: -2,
    lineHeight: 60,
  },
  copyBlock: {
    gap: 10,
  },
  title: {
    ...typography.displayBold,
    fontSize: 30,
    letterSpacing: -1.1,
    lineHeight: 34,
  },
  message: {
    ...typography.bodyRegular,
    fontSize: fontSize.xl,
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 18,
    padding: 20,
  },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
  },
  cardBody: {
    ...typography.bodyRegular,
    fontSize: fontSize.xl,
    lineHeight: 22,
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 18,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  retryButtonText: {
    ...typography.bodyBold,
    fontSize: fontSize.xl,
  },
});
