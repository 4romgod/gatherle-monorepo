import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import {
  buildDayKeyFromDate,
  buildWeekDays,
  formatCalendarAgendaDayLabel,
  formatCalendarWeekday,
  groupOccurrencesByCalendarDay,
  isSameCalendarDay,
} from '@/lib/events/occurrenceCalendar';
import { OccurrenceDayAgendaSheet } from './OccurrenceDayAgendaSheet';
import { OccurrenceCalendarSnippet } from './OccurrenceCalendarSnippet';

type EventsWeekViewProps = {
  anchorDate: Date;
  occurrences: MobileEventOccurrence[];
  onPressOccurrence: (occurrence: MobileEventOccurrence) => void;
};

function resolveDefaultSelectedDayKey(
  weekDays: Date[],
  groupedOccurrences: Record<string, MobileEventOccurrence[]>,
  anchorDate: Date,
) {
  const anchorKey = buildDayKeyFromDate(anchorDate);
  if ((groupedOccurrences[anchorKey] ?? []).length > 0) {
    return anchorKey;
  }

  const firstActiveDay = weekDays.find((day) => (groupedOccurrences[buildDayKeyFromDate(day)] ?? []).length > 0);
  return firstActiveDay ? buildDayKeyFromDate(firstActiveDay) : anchorKey;
}

export function EventsWeekView({ anchorDate, occurrences, onPressOccurrence }: EventsWeekViewProps) {
  const { theme } = useAppTheme();
  const anchorDateKey = buildDayKeyFromDate(anchorDate);
  const weekDays = useMemo(() => buildWeekDays(anchorDate), [anchorDateKey]);
  const groupedOccurrences = useMemo(() => groupOccurrencesByCalendarDay(occurrences), [occurrences]);
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    resolveDefaultSelectedDayKey(weekDays, groupedOccurrences, anchorDate),
  );
  const [isAgendaVisible, setAgendaVisible] = useState(false);
  const didUserSelectDayRef = useRef(false);
  const previousAnchorDateKeyRef = useRef(anchorDateKey);
  const defaultSelectedDayKey = useMemo(
    () => resolveDefaultSelectedDayKey(weekDays, groupedOccurrences, anchorDate),
    [anchorDate, groupedOccurrences, weekDays],
  );

  useEffect(() => {
    const anchorChanged = previousAnchorDateKeyRef.current !== anchorDateKey;
    previousAnchorDateKeyRef.current = anchorDateKey;

    if (anchorChanged) {
      didUserSelectDayRef.current = false;
      setAgendaVisible(false);
    }

    if (!didUserSelectDayRef.current) {
      setSelectedDayKey(defaultSelectedDayKey);
    }
  }, [anchorDateKey, defaultSelectedDayKey]);

  const selectedDay = weekDays.find((day) => buildDayKeyFromDate(day) === selectedDayKey) ?? anchorDate;
  const selectedOccurrences = groupedOccurrences[selectedDayKey] ?? [];

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} horizontal showsHorizontalScrollIndicator={false}>
        {weekDays.map((day) => {
          const dayKey = buildDayKeyFromDate(day);
          const dayOccurrences = groupedOccurrences[dayKey] ?? [];
          const isSelected = selectedDayKey === dayKey;
          const isToday = isSameCalendarDay(day, new Date());

          return (
            <Pressable
              key={dayKey}
              onPress={() => {
                didUserSelectDayRef.current = true;
                setSelectedDayKey(dayKey);
                setAgendaVisible(true);
              }}
              style={({ pressed }) => [
                styles.dayCard,
                {
                  backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.dayLabelBlock}>
                  <Text style={[styles.weekdayLabel, { color: theme.colors.textMuted }]}>
                    {formatCalendarWeekday(day)}
                  </Text>
                  <Text
                    style={[styles.dayNumber, { color: isToday ? theme.colors.primary : theme.colors.textPrimary }]}
                  >
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>

                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: dayOccurrences.length > 0 ? theme.colors.primary : theme.colors.surfaceMuted },
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeLabel,
                      { color: dayOccurrences.length > 0 ? theme.colors.primaryContrast : theme.colors.textSecondary },
                    ]}
                  >
                    {dayOccurrences.length}
                  </Text>
                </View>
              </View>

              {dayOccurrences.length > 0 ? (
                <View style={styles.snippetList}>
                  {dayOccurrences.slice(0, 3).map((occurrence) => (
                    <OccurrenceCalendarSnippet key={occurrence.occurrenceId} occurrence={occurrence} />
                  ))}
                  {dayOccurrences.length > 3 ? (
                    <Text style={[styles.moreLabel, { color: theme.colors.textSecondary }]}>
                      +{dayOccurrences.length - 3} more in agenda
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.quietState}>
                  <Text style={[styles.quietText, { color: theme.colors.textSecondary }]}>Quiet day</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <OccurrenceDayAgendaSheet
        dayLabel={formatCalendarAgendaDayLabel(selectedDay)}
        occurrences={selectedOccurrences}
        onClose={() => setAgendaVisible(false)}
        onPressOccurrence={onPressOccurrence}
        visible={isAgendaVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  countBadge: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.pill,
    justifyContent: 'center',
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  countBadgeLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  dayCard: {
    borderRadius: MOBILE_RADIUS.card,
    borderWidth: 1,
    gap: 14,
    minHeight: 220,
    padding: 14,
    width: 164,
  },
  dayLabelBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  dayNumber: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
    letterSpacing: -0.3,
  },
  moreLabel: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
    paddingHorizontal: 4,
  },
  quietState: {
    flex: 1,
    justifyContent: 'center',
  },
  quietText: {
    ...typography.bodyRegular,
    fontSize: fontSize.lg,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  snippetList: {
    gap: 10,
  },
  weekdayLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.md,
    letterSpacing: 0.9,
  },
});
