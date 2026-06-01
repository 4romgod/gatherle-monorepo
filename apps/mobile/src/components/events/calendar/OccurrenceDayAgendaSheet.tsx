import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import {
  formatOccurrenceSessionTime,
  getEventCityLabel,
  getEventSummary,
  getEventTitle,
  getOccurrenceParticipantCount,
} from '@/lib/events/formatters';

type OccurrenceDayAgendaSheetProps = {
  dayLabel: string;
  occurrences: MobileEventOccurrence[];
  onClose: () => void;
  onPressOccurrence: (occurrence: MobileEventOccurrence) => void;
  visible: boolean;
};

function AgendaRow({ occurrence, onPress }: { occurrence: MobileEventOccurrence; onPress: () => void }) {
  const { theme } = useAppTheme();
  const title = getEventTitle(occurrence);
  const summary = getEventSummary(occurrence);
  const locationLabel = getEventCityLabel(occurrence);
  const timeLabel = formatOccurrenceSessionTime(occurrence.startAt, occurrence.timezone);
  const participantCount = getOccurrenceParticipantCount(occurrence);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.agendaRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.timeBlock, { backgroundColor: theme.colors.primarySoft }]}>
        <Text style={[styles.timeBlockText, { color: theme.colors.primary }]} numberOfLines={2}>
          {timeLabel}
        </Text>
      </View>

      <View style={styles.agendaBody}>
        {participantCount > 0 ? (
          <View
            style={[styles.metaChip, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
          >
            <Feather color={theme.colors.textSecondary} name="users" size={11} />
            <Text style={[styles.metaChipLabel, { color: theme.colors.textSecondary }]}>{participantCount} going</Text>
          </View>
        ) : null}

        <Text style={[styles.agendaTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.agendaSummary, { color: theme.colors.textSecondary }]} numberOfLines={3}>
          {summary}
        </Text>

        <View style={styles.metaLine}>
          <Feather color={theme.colors.textMuted} name="map-pin" size={13} />
          <Text style={[styles.metaLineText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function OccurrenceDayAgendaSheet({
  dayLabel,
  occurrences,
  onClose,
  onPressOccurrence,
  visible,
}: OccurrenceDayAgendaSheetProps) {
  const { theme } = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['78%'], []);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }

    sheetRef.current?.dismiss();
  }, [visible]);

  useEffect(() => {
    if (!mounted || !visible) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      sheetRef.current?.present();
    });

    return () => cancelAnimationFrame(frame);
  }, [mounted, visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.32} pressBehavior="close" />
    ),
    [],
  );

  if (!mounted) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: theme.colors.border, width: 40 }}
      onDismiss={() => {
        setMounted(false);
        if (visible) {
          onClose();
        }
      }}
      snapPoints={snapPoints}
    >
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerBody}>
            <Text style={[styles.headerOverline, { color: theme.colors.textMuted }]}>Day agenda</Text>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>{dayLabel}</Text>
            <View style={[styles.countChip, { backgroundColor: theme.colors.primarySoft }]}>
              <Text style={[styles.countChipLabel, { color: theme.colors.primary }]}>
                {occurrences.length} occurrence{occurrences.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          <Pressable hitSlop={8} onPress={onClose} style={styles.closeButton}>
            <Feather color={theme.colors.textPrimary} name="x" size={22} />
          </Pressable>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          style={styles.scrollArea}
        >
          {occurrences.length > 0 ? (
            occurrences.map((occurrence) => (
              <AgendaRow
                key={occurrence.occurrenceId}
                occurrence={occurrence}
                onPress={() => {
                  onClose();
                  onPressOccurrence(occurrence);
                }}
              />
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No events scheduled</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Try another date or loosen your filters to see more occurrences.
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </SafeAreaView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  agendaBody: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  agendaRow: {
    borderRadius: MOBILE_RADIUS.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  agendaSummary: {
    ...typography.bodyRegular,
    fontSize: fontSize.lg,
    lineHeight: 22,
  },
  agendaTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
    lineHeight: 24,
  },
  body: {
    gap: 14,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  countChip: {
    alignSelf: 'flex-start',
    borderRadius: MOBILE_RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countChipLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  emptyState: {
    borderRadius: MOBILE_RADIUS.card,
    gap: 8,
    padding: 18,
  },
  emptyText: {
    ...typography.bodyRegular,
    fontSize: fontSize.lg,
    lineHeight: 22,
  },
  emptyTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
  },
  header: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  headerOverline: {
    ...typography.bodyBold,
    fontSize: fontSize.md,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl3,
    letterSpacing: -0.4,
  },
  metaChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: MOBILE_RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaChipLabel: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  metaLineText: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: fontSize.lg,
  },
  safeArea: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  timeBlock: {
    borderRadius: MOBILE_RADIUS.compact,
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  timeBlockText: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
    lineHeight: 18,
  },
});
