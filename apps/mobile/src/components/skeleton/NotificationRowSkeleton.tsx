import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { SkeletonBlock } from './SkeletonBlock';

type NotificationRowSkeletonProps = {
  withActions?: boolean;
};

export function NotificationRowSkeleton({ withActions = true }: NotificationRowSkeletonProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.leading}>
        <SkeletonBlock style={styles.unreadDot} />
        <SkeletonBlock style={styles.avatar} />
      </View>

      <View style={styles.content}>
        <SkeletonBlock style={styles.title} />
        <SkeletonBlock style={styles.messageLong} />
        <SkeletonBlock style={styles.messageShort} />
        <SkeletonBlock style={styles.meta} />
        {withActions ? (
          <View style={styles.inlineActions}>
            <SkeletonBlock style={styles.actionButton} />
            <SkeletonBlock style={styles.actionButton} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 999,
    height: 28,
    width: 76,
  },
  avatar: {
    borderRadius: 999,
    height: 34,
    width: 34,
  },
  content: {
    flex: 1,
    gap: 5,
    minHeight: 34,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  leading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  messageLong: {
    height: 12,
    width: '70%',
  },
  messageShort: {
    height: 12,
    width: '46%',
  },
  meta: {
    height: 10,
    marginTop: 1,
    width: 72,
  },
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  title: {
    height: 14,
    width: '56%',
  },
  unreadDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
});
