'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { Box, ButtonBase, Chip, Stack, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import { EventOccurrenceStatus } from '@/data/graphql/types/graphql';
import Surface from '@/components/core/Surface';
import OccurrenceCalendarSnippet from './OccurrenceCalendarSnippet';
import OccurrenceDayAgendaDialog from './OccurrenceDayAgendaDialog';
import {
  buildDayKeyFromAnchor,
  buildMonthGridDays,
  buildWeekDays,
  groupOccurrencesByCalendarDay,
} from './calendar-utils';
import { WEB_RADIUS } from '@/lib/constants/radius';

interface EventsMonthViewProps {
  anchorDate: Dayjs;
  occurrences: EventOccurrencePreview[];
}

function buildWeekDaysMondayFirst(anchorDate: Dayjs) {
  const mondayIndex = (anchorDate.day() + 6) % 7;
  const monday = anchorDate.startOf('day').subtract(mondayIndex, 'day');
  return Array.from({ length: 7 }, (_, index) => monday.add(index, 'day'));
}

function buildMonthGridDaysMondayFirst(anchorDate: Dayjs) {
  const monthStart = anchorDate.startOf('month').startOf('day');
  const monthEnd = anchorDate.endOf('month').startOf('day');
  const startOffset = (monthStart.day() + 6) % 7;
  const endOffset = 6 - ((monthEnd.day() + 6) % 7);
  const gridStart = monthStart.subtract(startOffset, 'day');
  const gridEnd = monthEnd.add(endOffset, 'day');
  const dayCount = gridEnd.diff(gridStart, 'day') + 1;

  return Array.from({ length: dayCount }, (_, index) => gridStart.add(index, 'day'));
}

function resolveDefaultSelectedMonthDayKey(
  monthGridDays: Dayjs[],
  groupedOccurrences: Record<string, EventOccurrencePreview[]>,
  anchorDate: Dayjs,
) {
  const anchorKey = buildDayKeyFromAnchor(anchorDate);
  if ((groupedOccurrences[anchorKey] ?? []).length > 0) {
    return anchorKey;
  }

  return (
    monthGridDays
      .find(
        (day) => day.isSame(anchorDate, 'month') && (groupedOccurrences[buildDayKeyFromAnchor(day)] ?? []).length > 0,
      )
      ?.format('YYYY-MM-DD') ?? anchorKey
  );
}

function resolveCompactDayTone(status: EventOccurrenceStatus, theme: Theme) {
  switch (status) {
    case EventOccurrenceStatus.Cancelled:
      return {
        background: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
        indicator: alpha(theme.palette.error.main, 0.84),
      };
    case EventOccurrenceStatus.Completed:
      return {
        background: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
        indicator: alpha(theme.palette.success.main, 0.88),
      };
    case EventOccurrenceStatus.Scheduled:
    default:
      return {
        background: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.09),
        indicator: alpha(theme.palette.primary.main, 0.88),
      };
  }
}

export default function EventsMonthView({ anchorDate, occurrences }: EventsMonthViewProps) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const anchorDateKey = anchorDate.format('YYYY-MM-DD');
  const desktopMonthGridDays = useMemo(() => buildMonthGridDays(anchorDate), [anchorDateKey]);
  const desktopWeekDayLabels = useMemo(() => buildWeekDays(anchorDate), [anchorDateKey]);
  const compactMonthGridDays = useMemo(() => buildMonthGridDaysMondayFirst(anchorDate), [anchorDateKey]);
  const compactWeekDayLabels = useMemo(() => buildWeekDaysMondayFirst(anchorDate), [anchorDateKey]);
  const monthGridDays = isCompact ? compactMonthGridDays : desktopMonthGridDays;
  const weekDayLabels = isCompact ? compactWeekDayLabels : desktopWeekDayLabels;
  const groupedOccurrences = useMemo(() => groupOccurrencesByCalendarDay(occurrences), [occurrences]);
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    resolveDefaultSelectedMonthDayKey(monthGridDays, groupedOccurrences, anchorDate),
  );
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const didUserSelectDayRef = useRef(false);
  const previousAnchorDateKeyRef = useRef(anchorDateKey);
  const defaultSelectedDayKey = useMemo(
    () => resolveDefaultSelectedMonthDayKey(monthGridDays, groupedOccurrences, anchorDate),
    [anchorDate, groupedOccurrences, monthGridDays],
  );

  useEffect(() => {
    const anchorChanged = previousAnchorDateKeyRef.current !== anchorDateKey;
    previousAnchorDateKeyRef.current = anchorDateKey;

    if (anchorChanged) {
      didUserSelectDayRef.current = false;
      setIsAgendaOpen(false);
    }

    if (!didUserSelectDayRef.current) {
      setSelectedDayKey(defaultSelectedDayKey);
    }
  }, [anchorDateKey, defaultSelectedDayKey]);

  const selectedDay = monthGridDays.find((day) => buildDayKeyFromAnchor(day) === selectedDayKey) ?? anchorDate;
  const selectedOccurrences = groupedOccurrences[selectedDayKey] ?? [];
  const selectedDayLabel = selectedDay.format('dddd, MMMM D');

  if (occurrences.length === 0) {
    return (
      <Surface sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          No events in this month
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try a different month or loosen your filters to see more occurrences.
        </Typography>
      </Surface>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {occurrences.length} occurrence{occurrences.length === 1 ? '' : 's'} in this month
      </Typography>

      {isCompact ? (
        <Stack spacing={1.25}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 0.9,
              px: 0.25,
            }}
          >
            {weekDayLabels.map((day) => {
              const isSunday = day.day() === 0;
              return (
                <Typography
                  key={`weekday-${day.format('ddd')}`}
                  variant="overline"
                  fontWeight={800}
                  sx={{
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    py: 0.3,
                    color: isSunday ? 'error.main' : 'text.secondary',
                  }}
                >
                  {day.format('dd').slice(0, 1)}
                </Typography>
              );
            })}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 0.9,
            }}
          >
            {monthGridDays.map((day) => {
              const dayKey = buildDayKeyFromAnchor(day);
              const dayOccurrences = groupedOccurrences[dayKey] ?? [];
              const isOutsideMonth = !day.isSame(anchorDate, 'month');
              const isSelected = selectedDayKey === dayKey;
              const isToday = day.isSame(new Date(), 'day');
              const isSunday = day.day() === 0;
              const tone = dayOccurrences[0] ? resolveCompactDayTone(dayOccurrences[0].status, theme) : null;

              return (
                <ButtonBase
                  key={dayKey}
                  onClick={() => {
                    didUserSelectDayRef.current = true;
                    setSelectedDayKey(dayKey);
                    setIsAgendaOpen(dayOccurrences.length > 0);
                  }}
                  sx={{
                    aspectRatio: '0.86',
                    minHeight: 78,
                    borderRadius: '18px',
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : alpha(theme.palette.divider, 0.6),
                    bgcolor:
                      tone?.background ??
                      alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.035),
                    opacity: isOutsideMonth ? 0.32 : 1,
                    px: 0.85,
                    py: 0.8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    boxShadow: isSelected ? `inset 0 0 0 1px ${alpha(theme.palette.common.white, 0.14)}` : undefined,
                    transition: 'background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
                    '&:active': {
                      transform: 'scale(0.985)',
                    },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box
                      sx={{
                        minWidth: 26,
                        height: 26,
                        px: isToday ? 0.8 : 0,
                        borderRadius: 999,
                        bgcolor: isToday
                          ? theme.palette.mode === 'dark'
                            ? 'common.white'
                            : 'text.primary'
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{
                          lineHeight: 1,
                          color: isToday
                            ? theme.palette.mode === 'dark'
                              ? 'common.black'
                              : 'background.paper'
                            : isSunday
                              ? 'error.main'
                              : 'text.primary',
                        }}
                      >
                        {day.format('D')}
                      </Typography>
                    </Box>

                    {dayOccurrences.length > 2 ? (
                      <Chip
                        label={dayOccurrences.length}
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontWeight: 700, minWidth: 24, mt: -0.1 }}
                      />
                    ) : null}
                  </Stack>

                  <Stack spacing={0.55} sx={{ px: 0.15 }}>
                    {dayOccurrences.slice(0, 2).map((occurrence) => {
                      const indicatorTone = resolveCompactDayTone(occurrence.status, theme);
                      return (
                        <Box
                          key={occurrence.occurrenceId}
                          sx={{
                            height: 6,
                            borderRadius: 999,
                            bgcolor: indicatorTone.indicator,
                          }}
                        />
                      );
                    })}
                  </Stack>
                </ButtonBase>
              );
            })}
          </Box>
        </Stack>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr',
          }}
        >
          <Surface disableShadow sx={{ p: 0, overflow: 'hidden', borderRadius: WEB_RADIUS.card }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              {weekDayLabels.map((day) => (
                <Typography
                  key={`weekday-${day.format('ddd')}`}
                  variant="overline"
                  fontWeight={800}
                  color="text.secondary"
                  sx={{ textAlign: 'center', letterSpacing: '0.08em', py: 1 }}
                >
                  {day.format('dd')}
                </Typography>
              ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {monthGridDays.map((day, index) => {
                const dayKey = buildDayKeyFromAnchor(day);
                const dayOccurrences = groupedOccurrences[dayKey] ?? [];
                const isOutsideMonth = !day.isSame(anchorDate, 'month');
                const isSelected = selectedDayKey === dayKey;
                const isToday = day.isSame(new Date(), 'day');
                const isLastColumn = index % 7 === 6;
                const isLastRow = index >= monthGridDays.length - 7;

                return (
                  <Box
                    key={dayKey}
                    sx={{
                      borderRight: isLastColumn ? 'none' : '1px solid',
                      borderBottom: isLastRow ? 'none' : '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        minHeight: { xs: 84, md: 126 },
                        p: { xs: 0.8, md: 1 },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                        opacity: isOutsideMonth ? 0.45 : 1,
                        boxShadow: isSelected ? `inset 0 0 0 1px ${theme.palette.primary.main}` : undefined,
                      }}
                    >
                      <ButtonBase
                        onClick={() => {
                          didUserSelectDayRef.current = true;
                          setSelectedDayKey(dayKey);
                          setIsAgendaOpen(dayOccurrences.length > 0);
                        }}
                        sx={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          borderRadius: '10px',
                          mx: -0.25,
                          px: 0.25,
                          py: 0.1,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="body2"
                            fontWeight={isToday ? 800 : 700}
                            color={isToday ? 'primary.main' : 'text.primary'}
                          >
                            {day.format('D')}
                          </Typography>
                          {dayOccurrences.length > 0 ? (
                            <Chip
                              label={dayOccurrences.length}
                              size="small"
                              color="primary"
                              sx={{ height: 20, fontWeight: 700, minWidth: 28 }}
                            />
                          ) : null}
                        </Stack>
                      </ButtonBase>

                      <Stack spacing={0.55} sx={{ display: { xs: 'none', md: 'flex' } }}>
                        {dayOccurrences.slice(0, 2).map((occurrence) => (
                          <OccurrenceCalendarSnippet key={occurrence.occurrenceId} event={occurrence} variant="month" />
                        ))}
                        {dayOccurrences.length > 2 ? (
                          <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ pl: 0.25 }}>
                            +{dayOccurrences.length - 2} more
                          </Typography>
                        ) : null}
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Surface>
        </Box>
      )}

      <OccurrenceDayAgendaDialog
        dayLabel={selectedDayLabel}
        occurrences={selectedOccurrences}
        open={isAgendaOpen}
        onClose={() => setIsAgendaOpen(false)}
      />
    </Stack>
  );
}
