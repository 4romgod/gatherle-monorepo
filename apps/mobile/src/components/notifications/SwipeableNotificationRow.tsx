import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

type SwipeableNotificationRowProps = React.ComponentProps<typeof NotificationRow> & {
  onDelete?: () => void;
};

function NotificationRightActions({ onDelete }: { onDelete?: () => void }) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.actionsWrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Alert.alert('Notification options', 'Choose how you want Gatherle to handle updates like this.', [
            { text: 'Mute this person' },
            { text: 'Mute this type' },
            { style: 'cancel', text: 'Cancel' },
          ])
        }
        style={[styles.actionButton, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
      >
        <Feather color={theme.colors.textPrimary} name="more-horizontal" size={16} />
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

export function SwipeableNotificationRow({ onDelete, ...props }: SwipeableNotificationRowProps) {
  return (
    <Swipeable overshootRight={false} renderRightActions={() => <NotificationRightActions onDelete={onDelete} />}>
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
