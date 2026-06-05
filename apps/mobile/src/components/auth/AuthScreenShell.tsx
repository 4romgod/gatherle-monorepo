import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/components/core/BrandMark';
import { KeyboardAwareScrollView } from '@/components/core/KeyboardAwareScrollView';
import { ThemeModeButton } from '@/components/core/ThemeModeButton';
import { MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET } from '@/lib/constants/layout';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type AuthScreenShellProps = {
  children: ReactNode;
  subtitle: string;
  title: string;
};

export function AuthScreenShell({ children, subtitle, title }: AuthScreenShellProps) {
  const { theme } = useAppTheme();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'android' ? MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET : 0}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentStack}>
          <View style={styles.headerBlock}>
            <View style={styles.headerBar}>
              <BrandMark />
              <ThemeModeButton />
            </View>
            <View style={styles.copyBlock}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
            </View>
          </View>
          {children}
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 112,
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  contentStack: {
    gap: 22,
    minHeight: '100%',
    paddingTop: 28,
  },
  copyBlock: {
    gap: 8,
  },
  headerBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerBlock: {
    gap: 18,
  },
  screen: {
    flex: 1,
  },
  subtitle: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    ...typography.displayBold,
    fontSize: 24,
    letterSpacing: -0.9,
    lineHeight: 30,
  },
});
