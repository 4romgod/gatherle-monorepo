import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import {
  buildDayKeyFromDate,
  formatCalendarAgendaDayLabel,
  formatCalendarWeekday,
  groupOccurrencesByCalendarDay,
  isSameCalendarDay,
  isSameCalendarMonth,
} from '@/lib/events/occurrenceCalendar';
import { OccurrenceDayAgendaSheet } from './OccurrenceDayAgendaSheet';

type EventsMonthViewProps = {
  anchorDate: Date;
  occurrences: MobileEventOccurrence[];
  onPressOccurrence: (occurrence: MobileEventOccurrence) => void;
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildWeekDaysMondayFirst(anchorDate: Date) {
  const mondayIndex = (anchorDate.getDay() + 6) % 7;
  const monday = addDays(startOfDay(anchorDate), -mondayIndex);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function buildMonthGridDaysMondayFirst(anchorDate: Date) {
  const monthStart = startOfDay(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  const monthEnd = startOfDay(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0));
  const startOffset = (monthStart.getDay() + 6) % 7;
  const endOffset = 6 - ((monthEnd.getDay() + 6) % 7);
  const gridStart = addDays(monthStart, -startOffset);
  const gridEnd = addDays(monthEnd, endOffset);
  const days: Date[] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function resolveDefaultSelectedDayKey(
  monthGridDays: Date[],
  groupedOccurrences: Record<string, MobileEventOccurrence[]>,
  anchorDate: Date,
) {
  const anchorKey = buildDayKeyFromDate(anchorDate);
  if ((groupedOccurrences[anchorKey] ?? []).length > 0) {
    return anchorKey;
  }

  const firstActiveMonthDay = monthGridDays.find(
    (day) => isSameCalendarMonth(day, anchorDate) && (groupedOccurrences[buildDayKeyFromDate(day)] ?? []).length > 0,
  );

  return firstActiveMonthDay ? buildDayKeyFromDate(firstActiveMonthDay) : anchorKey;
}

function resolveDayTone(occurrence: MobileEventOccurrence, theme: ReturnType<typeof useAppTheme>['theme']) {
  if (occurrence.status === 'Cancelled') {
    return {
      backgroundColor: theme.dark ? '#2c1519' : '#241416',
      indicatorColor: theme.colors.error,
    };
  }

  if (occurrence.status === 'Completed') {
    return {
      backgroundColor: theme.dark ? '#0b3024' : '#0e311f',
      indicatorColor: theme.colors.success,
    };
  }

  return {
    backgroundColor: theme.dark ? '#151832' : '#171a34',
    indicatorColor: theme.colors.primary,
  };
}

export function EventsMonthView({ anchorDate, occurrences, onPressOccurrence }: EventsMonthViewProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const anchorDateKey = buildDayKeyFromDate(anchorDate);
  const monthGridDays = useMemo(() => buildMonthGridDaysMondayFirst(anchorDate), [anchorDateKey]);
  const weekDayLabels = useMemo(() => buildWeekDaysMondayFirst(anchorDate), [anchorDateKey]);
  const groupedOccurrences = useMemo(() => groupOccurrencesByCalendarDay(occurrences), [occurrences]);
  const gap = 8;
  const availableWidth = Math.max(width - 32, 280);
  const cellSize = Math.floor((availableWidth - gap * 6) / 7);
  const cellHeight = Math.max(72, Math.round(cellSize * 1.04));
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    resolveDefaultSelectedDayKey(monthGridDays, groupedOccurrences, anchorDate),
  );
  const [isAgendaVisible, setAgendaVisible] = useState(false);
  const didUserSelectDayRef = useRef(false);
  const previousAnchorDateKeyRef = useRef(anchorDateKey);
  const defaultSelectedDayKey = useMemo(
    () => resolveDefaultSelectedDayKey(monthGridDays, groupedOccurrences, anchorDate),
    [anchorDate, groupedOccurrences, monthGridDays],
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

  const selectedDay = monthGridDays.find((day) => buildDayKeyFromDate(day) === selectedDayKey) ?? anchorDate;
  const selectedOccurrences = groupedOccurrences[selectedDayKey] ?? [];

  return (
    <>
      <View style={[styles.calendarRoot, { backgroundColor: theme.dark ? '#050607' : '#0a0d12' }]}>
        <View style={[styles.weekdayRow, { gap }]}>
          {weekDayLabels.map((day) => {
            const isSunday = day.getDay() === 0;
            return (
              <View key={`weekday-${day.toISOString()}`} style={[styles.weekdayCell, { width: cellSize }]}>
                <Text style={[styles.weekdayLabel, { color: isSunday ? '#ff6d6d' : 'rgba(255,255,255,0.68)' }]}>
                  {formatCalendarWeekday(day, 'narrow')}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.grid, { gap }]}>
          {monthGridDays.map((day) => {
            const dayKey = buildDayKeyFromDate(day);
            const dayOccurrences = groupedOccurrences[dayKey] ?? [];
            const isSelected = selectedDayKey === dayKey;
            const isOutsideMonth = !isSameCalendarMonth(day, anchorDate);
            const isToday = isSameCalendarDay(day, new Date());
            const isSunday = day.getDay() === 0;
            const tone = dayOccurrences[0] ? resolveDayTone(dayOccurrences[0], theme) : null;
            const hasEvents = dayOccurrences.length > 0;

            return (
              <Pressable
                key={dayKey}
                onPress={() => {
                  didUserSelectDayRef.current = true;
                  setSelectedDayKey(dayKey);
                  setAgendaVisible(dayOccurrences.length > 0);
                }}
                style={({ pressed }) => [
                  styles.dayCell,
                  {
                    backgroundColor: tone?.backgroundColor ?? '#171717',
                    borderColor: isSelected ? 'rgba(255,255,255,0.34)' : 'transparent',
                    opacity: isOutsideMonth ? 0.42 : pressed ? 0.82 : 1,
                    width: cellSize,
                    minHeight: cellHeight,
                  },
                ]}
              >
                <View style={styles.dayHeader}>
                  <View
                    style={[
                      styles.dayNumberPill,
                      {
                        backgroundColor: isToday ? '#ffffff' : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.dayNumber, { color: isToday ? '#111111' : isSunday ? '#ff6d6d' : '#ffffff' }]}>
                      {day.getDate()}
                    </Text>
                  </View>
                </View>

                <View style={styles.dayIndicatorRail}>
                  {dayOccurrences.slice(0, 2).map((occurrence) => {
                    const occurrenceTone = resolveDayTone(occurrence, theme);
                    return (
                      <View
                        key={occurrence.occurrenceId}
                        style={[
                          styles.dayIndicator,
                          {
                            backgroundColor: occurrenceTone.indicatorColor,
                          },
                        ]}
                      />
                    );
                  })}
                  {!hasEvents ? <View style={styles.dayIndicatorSpacer} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

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
  calendarRoot: {
    borderRadius: 30,
    gap: 14,
    paddingBottom: 18,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  dayCell: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  dayHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  dayIndicator: {
    borderRadius: MOBILE_RADIUS.pill,
    height: 8,
  },
  dayIndicatorRail: {
    gap: 5,
    marginTop: 'auto',
  },
  dayIndicatorSpacer: {
    height: 8,
    opacity: 0,
  },
  dayNumber: {
    ...typography.bodyBold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl + 2,
  },
  dayNumberPill: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.pill,
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 30,
    paddingHorizontal: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
    letterSpacing: 1.6,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
});
