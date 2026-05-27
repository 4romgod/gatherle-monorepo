import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ParticipantStatus } from '@data/graphql/types/graphql';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';

type EventRsvpSheetProps = {
  currentStatus: ParticipantStatus | null;
  loading?: boolean;
  onClose: () => void;
  onSelectStatus: (status: ParticipantStatus) => void;
  onCancelRsvp: () => void;
  visible: boolean;
};

type RsvpOption = {
  description: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  status: ParticipantStatus;
};

const RSVP_OPTIONS: RsvpOption[] = [
  {
    description: 'Reserve your spot and show up on the attendee list.',
    icon: 'check-circle',
    label: 'Going',
    status: ParticipantStatus.Going,
  },
  {
    description: 'Track the event without committing to attendance yet.',
    icon: 'star',
    label: 'Interested',
    status: ParticipantStatus.Interested,
  },
];

export function EventRsvpSheet({
  currentStatus,
  loading = false,
  onClose,
  onSelectStatus,
  onCancelRsvp,
  visible,
}: EventRsvpSheetProps) {
  const { theme } = useAppTheme();
  const hasRsvp = currentStatus !== null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <SafeAreaView>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>RSVP to this event</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Choose how you want to show up, similar to the web experience.
              </Text>
            </View>

            <View style={styles.options}>
              {RSVP_OPTIONS.map((option) => {
                const selected = currentStatus === option.status;

                return (
                  <Pressable
                    disabled={loading}
                    key={option.status}
                    onPress={() => onSelectStatus(option.status)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? theme.colors.successSoft : theme.colors.surfaceMuted,
                        borderColor: selected ? theme.colors.success : theme.colors.border,
                        opacity: loading ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.optionIconWrap,
                        {
                          backgroundColor: selected ? theme.colors.success : theme.colors.surface,
                          borderColor: selected ? theme.colors.success : theme.colors.border,
                        },
                      ]}
                    >
                      <Feather
                        color={selected ? theme.colors.primaryContrast : theme.colors.textPrimary}
                        name={option.icon}
                        size={18}
                      />
                    </View>

                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>{option.label}</Text>
                      <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                        {option.description}
                      </Text>
                    </View>

                    {selected ? <Feather color={theme.colors.success} name="check" size={18} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {hasRsvp ? (
              <Pressable
                disabled={loading}
                onPress={onCancelRsvp}
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: theme.colors.errorSoft,
                    borderColor: theme.colors.error,
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                <Feather color={theme.colors.error} name="slash" size={16} />
                <Text style={[styles.cancelButtonText, { color: theme.colors.error }]}>Cancel RSVP</Text>
              </Pressable>
            ) : null}

            <Pressable disabled={loading} onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>Close</Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  cancelButtonText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  closeButton: {
    alignItems: 'center',
    marginTop: 14,
    minHeight: 42,
    justifyContent: 'center',
  },
  closeButtonText: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: 999,
    height: 4,
    marginBottom: 18,
    width: 42,
  },
  header: {
    gap: 6,
  },
  option: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionDescription: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 18,
  },
  optionIconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  options: {
    gap: 12,
    marginTop: 20,
  },
  sheet: {
    borderTopLeftRadius: MOBILE_RADIUS.panel,
    borderTopRightRadius: MOBILE_RADIUS.panel,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  subtitle: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  title: {
    ...typography.displayBold,
    fontSize: fontSize.xl3,
    letterSpacing: -0.4,
  },
});
