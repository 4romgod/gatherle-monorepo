'use client';

import { Button, IconButton, Stack, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import type { Dayjs } from 'dayjs';
import type { EventsCalendarViewMode } from './calendar-utils';
import { buildOccurrenceCalendarLabel } from './calendar-utils';

interface EventsCalendarNavigatorProps {
  anchorDate: Dayjs;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  viewMode: Exclude<EventsCalendarViewMode, 'list'>;
}

export default function EventsCalendarNavigator({
  anchorDate,
  onNext,
  onPrevious,
  onToday,
  viewMode,
}: EventsCalendarNavigatorProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mb: 3 }}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton aria-label={`Show previous ${viewMode}`} onClick={onPrevious} size="small">
            <ChevronLeft />
          </IconButton>
          <IconButton aria-label={`Show next ${viewMode}`} onClick={onNext} size="small">
            <ChevronRight />
          </IconButton>
        </Stack>

        <Stack sx={{ minWidth: 0, flex: 1 }} spacing={0.25}>
          <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
            {viewMode === 'week' ? 'Week View' : 'Month View'}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.1 }}>
            {buildOccurrenceCalendarLabel(viewMode, anchorDate)}
          </Typography>
        </Stack>
      </Stack>

      <Button
        variant="outlined"
        startIcon={<Today fontSize="small" />}
        onClick={onToday}
        sx={{
          alignSelf: { xs: 'flex-start', sm: 'center' },
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 999,
          px: 2,
        }}
      >
        Today
      </Button>
    </Stack>
  );
}
