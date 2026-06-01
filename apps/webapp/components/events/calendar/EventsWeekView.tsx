'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { Box, ButtonBase, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import Surface from '@/components/core/Surface';
import OccurrenceCalendarSnippet from './OccurrenceCalendarSnippet';
import OccurrenceDayAgendaDialog from './OccurrenceDayAgendaDialog';
import { buildDayKeyFromAnchor, buildWeekDays, groupOccurrencesByCalendarDay } from './calendar-utils';
import { WEB_RADIUS } from '@/lib/constants/radius';

interface EventsWeekViewProps {
  anchorDate: Dayjs;
  occurrences: EventOccurrencePreview[];
}

function resolveDefaultSelectedWeekDayKey(
  weekDays: Dayjs[],
  groupedOccurrences: Record<string, EventOccurrencePreview[]>,
  anchorDate: Dayjs,
) {
  const anchorKey = buildDayKeyFromAnchor(anchorDate);
  if ((groupedOccurrences[anchorKey] ?? []).length > 0) {
    return anchorKey;
  }

  return (
    weekDays.find((day) => (groupedOccurrences[buildDayKeyFromAnchor(day)] ?? []).length > 0)?.format('YYYY-MM-DD') ??
    anchorKey
  );
}

export default function EventsWeekView({ anchorDate, occurrences }: EventsWeekViewProps) {
  const theme = useTheme();
  const anchorDateKey = anchorDate.format('YYYY-MM-DD');
  const weekDays = useMemo(() => buildWeekDays(anchorDate), [anchorDateKey]);
  const groupedOccurrences = useMemo(() => groupOccurrencesByCalendarDay(occurrences), [occurrences]);
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    resolveDefaultSelectedWeekDayKey(weekDays, groupedOccurrences, anchorDate),
  );
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const didUserSelectDayRef = useRef(false);
  const previousAnchorDateKeyRef = useRef(anchorDateKey);
  const defaultSelectedDayKey = useMemo(
    () => resolveDefaultSelectedWeekDayKey(weekDays, groupedOccurrences, anchorDate),
    [anchorDate, groupedOccurrences, weekDays],
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

  const selectedDay = weekDays.find((day) => buildDayKeyFromAnchor(day) === selectedDayKey) ?? anchorDate;
  const selectedOccurrences = groupedOccurrences[selectedDayKey] ?? [];
  const selectedDayLabel = selectedDay.format('dddd, MMMM D');

  if (occurrences.length === 0) {
    return (
      <Surface sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          No events in this week
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try a different week or loosen your filters to see more occurrences.
        </Typography>
      </Surface>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {occurrences.length} occurrence{occurrences.length === 1 ? '' : 's'} in this week
      </Typography>

      <Surface
        disableShadow
        sx={{
          p: 0,
          overflow: 'hidden',
          borderRadius: WEB_RADIUS.card,
          display: { xs: 'none', lg: 'block' },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          {weekDays.map((day) => {
            const dayKey = buildDayKeyFromAnchor(day);
            const isSelected = selectedDayKey === dayKey;
            const isToday = day.isSame(new Date(), 'day');
            const dayOccurrenceCount = groupedOccurrences[dayKey]?.length ?? 0;

            return (
              <ButtonBase
                key={`header-${dayKey}`}
                onClick={() => {
                  didUserSelectDayRef.current = true;
                  setSelectedDayKey(dayKey);
                  setIsAgendaOpen(dayOccurrenceCount > 0);
                }}
                sx={{
                  display: 'block',
                  textAlign: 'left',
                  alignItems: 'stretch',
                  justifyContent: 'stretch',
                  borderRight: dayKey === buildDayKeyFromAnchor(weekDays.at(-1)!) ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    minHeight: 74,
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, 0.08)
                      : isToday
                        ? alpha(theme.palette.primary.main, 0.04)
                        : 'transparent',
                    boxShadow: isSelected ? `inset 0 -2px 0 ${theme.palette.primary.main}` : undefined,
                  }}
                >
                  <Typography
                    variant="overline"
                    fontWeight={800}
                    color="text.secondary"
                    sx={{ letterSpacing: '0.08em' }}
                  >
                    {day.format('ddd')}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1 }}>
                    {day.format('D')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                    {dayOccurrenceCount > 0
                      ? `${dayOccurrenceCount} event${dayOccurrenceCount === 1 ? '' : 's'}`
                      : 'Quiet day'}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {weekDays.map((day, index) => {
            const dayKey = buildDayKeyFromAnchor(day);
            const dayOccurrences = groupedOccurrences[dayKey] ?? [];
            const isSelected = selectedDayKey === dayKey;

            return (
              <Box
                key={dayKey}
                sx={{
                  borderRight: index === weekDays.length - 1 ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    minHeight: 240,
                    p: 1.25,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.95,
                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.035) : 'background.paper',
                  }}
                >
                  {dayOccurrences.length > 0 ? (
                    dayOccurrences.map((occurrence) => (
                      <OccurrenceCalendarSnippet key={occurrence.occurrenceId} event={occurrence} variant="week" />
                    ))
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        pt: 0.5,
                      }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        Quiet day
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Surface>

      <Stack spacing={1.5} sx={{ display: { xs: 'flex', lg: 'none' } }}>
        {weekDays.map((day) => {
          const dayKey = buildDayKeyFromAnchor(day);
          const dayOccurrences = groupedOccurrences[dayKey] ?? [];

          return (
            <Surface key={`mobile-${dayKey}`} disableShadow sx={{ p: 1.75, borderRadius: WEB_RADIUS.card }}>
              <Stack spacing={1.25}>
                <Box>
                  <Typography
                    variant="overline"
                    fontWeight={800}
                    color="text.secondary"
                    sx={{ letterSpacing: '0.08em' }}
                  >
                    {day.format('dddd')}
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {day.format('MMMM D')}
                  </Typography>
                </Box>

                {dayOccurrences.length > 0 ? (
                  <Stack spacing={1}>
                    {dayOccurrences.map((occurrence) => (
                      <OccurrenceCalendarSnippet key={occurrence.occurrenceId} event={occurrence} variant="week" />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Quiet day
                  </Typography>
                )}
              </Stack>
            </Surface>
          );
        })}
      </Stack>

      <OccurrenceDayAgendaDialog
        dayLabel={selectedDayLabel}
        occurrences={selectedOccurrences}
        open={isAgendaOpen}
        onClose={() => setIsAgendaOpen(false)}
      />
    </Stack>
  );
}
