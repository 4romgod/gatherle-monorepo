import { Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type SwipeableNotificationRowProps = React.ComponentProps<typeof NotificationRow> & {
  onDelete?: () => void;
  onToggleRead?: () => void;
};

function NotificationRightActions({
  isRead,
  onDelete,
  onToggleRead,
}: {
  isRead?: boolean;
  onDelete?: () => void;
  onToggleRead?: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.actionsWrap}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggleRead}
        style={[styles.actionButton, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
      >
        <Feather color={theme.colors.textPrimary} name={isRead ? 'mail' : 'check'} size={16} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        style={[styles.actionButton, { backgroundColor: theme.colors.errorSoft, borderColor: theme.colors.error }]}
      >
        <Feather color={theme.colors.error} name="trash-2" size={16} />
      </Pressable>
    </View>
  );
}

export function SwipeableNotificationRow({ onDelete, onToggleRead, ...props }: SwipeableNotificationRowProps) {
  return (
    <Swipeable
      dragOffsetFromRightEdge={18}
      overshootRight={false}
      renderRightActions={() => (
        <NotificationRightActions isRead={props.isRead} onDelete={onDelete} onToggleRead={onToggleRead} />
      )}
    >
      <NotificationRow {...props} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionsWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingLeft: 10,
    width: 110,
  },
});
