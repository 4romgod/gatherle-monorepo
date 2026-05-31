import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';

type AdminModalProps = PropsWithChildren<{
  footer?: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
}>;

export function AdminModal({ children, footer, onClose, title, visible }: AdminModalProps) {
  const { theme } = useAppTheme();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent={false}
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Pressable hitSlop={8} onPress={onClose} style={styles.closeButton}>
            <Feather color={theme.colors.textPrimary} name="x" size={22} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer ? <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>{footer}</View> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 18,
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  footer: {
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  safeArea: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    flex: 1,
    fontSize: fontSize.xl,
    letterSpacing: -0.2,
  },
});
