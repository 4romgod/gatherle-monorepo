import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RemoteImage } from '@/components/core/RemoteImage';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type EventImageViewerModalProps = {
  imageUrl?: string | null;
  onClose: () => void;
  title: string;
  visible: boolean;
};

export function EventImageViewerModal({ imageUrl, onClose, title, visible }: EventImageViewerModalProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const fallback = (
    <LinearGradient colors={theme.colors.heroGradient} style={styles.fallback}>
      <Text style={[styles.fallbackText, { color: theme.colors.heroText }]}>{title.charAt(0).toUpperCase()}</Text>
    </LinearGradient>
  );

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent visible={visible}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.96)', paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.heroText }]}>
            {title}
          </Text>
          <Pressable
            accessibilityLabel="Close image viewer"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Feather color={theme.colors.textPrimary} name="x" size={18} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <RemoteImage fallback={fallback} resizeMode="contain" showLoader style={styles.image} uri={imageUrl} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  fallbackText: {
    ...typography.displayBold,
    fontSize: 52,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 48,
  },
  headerTitle: {
    ...typography.bodyBold,
    flex: 1,
    fontSize: 15,
  },
  image: {
    flex: 1,
    width: '100%',
  },
});
