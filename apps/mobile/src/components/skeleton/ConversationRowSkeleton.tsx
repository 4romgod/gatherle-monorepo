import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { SkeletonBlock } from './SkeletonBlock';

export function ConversationRowSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <SkeletonBlock style={styles.avatar} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <SkeletonBlock style={styles.title} />
          <View style={styles.metaRow}>
            <SkeletonBlock style={styles.unreadBadge} />
            <SkeletonBlock style={styles.time} />
          </View>
        </View>
        <SkeletonBlock style={styles.preview} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: 40,
    width: 40,
  },
  content: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  preview: {
    height: 12,
    width: '52%',
  },
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  time: {
    height: 12,
    width: 64,
  },
  title: {
    height: 14,
    width: '44%',
  },
  unreadBadge: {
    borderRadius: 999,
    height: 18,
    width: 24,
  },
});
