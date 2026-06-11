'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  Grid,
  Box,
  FormControlLabel,
  Card,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
  buildEventRecurrenceRule,
  EVENT_RECURRENCE_FREQUENCIES,
  EVENT_RECURRENCE_WEEKDAYS,
  formatRRuleUntilToken,
  normalizeRecurrenceInterval,
  parseEventRecurrenceRule,
  parseRRuleUntilToken,
  type EventRecurrenceFrequency,
  type EventRecurrenceWeekday,
} from '@gatherle/commons/client/utils';
import dayjs, { Dayjs } from 'dayjs';
import EventRadioButtons from '@/components/buttons/EventTypeRadioButton';
import { EventDateInputProps } from '@/lib/constants';
import { resolveEventScheduleTimezone } from '@/lib/utils/eventSchedule';
import { z } from 'zod';

const RECURRENCE_STORAGE_KEY = 'gatherle:eventDateInput';

const PersistedRecurrenceSchema = z.object({
  eventType: z.enum(['single', 'recurring']),
  frequency: z.enum(EVENT_RECURRENCE_FREQUENCIES),
  interval: z.number().int().positive(),
  daysOfWeek: z.array(z.enum(EVENT_RECURRENCE_WEEKDAYS)),
});

type PersistedRecurrenceState = z.infer<typeof PersistedRecurrenceSchema>;

const FREQUENCY_LABELS: Record<EventRecurrenceFrequency, string> = {
  DAILY: 'Daily',
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  YEARLY: 'Yearly',
};

const WEEKDAY_LABELS: Record<EventRecurrenceWeekday, string> = {
  FR: 'Fri',
  MO: 'Mon',
  SA: 'Sat',
  SU: 'Sun',
  TH: 'Thu',
  TU: 'Tue',
  WE: 'Wed',
};

function loadPersistedState(): PersistedRecurrenceState | null {
  try {
    const raw = localStorage.getItem(RECURRENCE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const result = PersistedRecurrenceSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function getWeekdayFromDayjs(value: Dayjs): EventRecurrenceWeekday {
  const weekday = value.day();

  switch (weekday) {
    case 0:
      return 'SU';
    case 1:
      return 'MO';
    case 2:
      return 'TU';
    case 3:
      return 'WE';
    case 4:
      return 'TH';
    case 5:
      return 'FR';
    default:
      return 'SA';
  }
}

function toggleWeekday(
  daysOfWeek: readonly EventRecurrenceWeekday[],
  weekday: EventRecurrenceWeekday,
): EventRecurrenceWeekday[] {
  return daysOfWeek.includes(weekday)
    ? daysOfWeek.filter((value) => value !== weekday)
    : [...daysOfWeek, weekday].sort(
        (left, right) => EVENT_RECURRENCE_WEEKDAYS.indexOf(left) - EVENT_RECURRENCE_WEEKDAYS.indexOf(right),
      );
}

function areSameDaySelections(left: readonly EventRecurrenceWeekday[], right: readonly EventRecurrenceWeekday[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export default function EventDateInput({ onChange, restorePersistedState = true, value }: EventDateInputProps) {
  const [eventType, setEventType] = useState<'single' | 'recurring'>('single');
  const [startDateTime, setStartDateTime] = useState<Dayjs | null>(dayjs());
  const [endDateTime, setEndDateTime] = useState<Dayjs | null>(dayjs().add(1, 'hour'));
  const [repeatUntil, setRepeatUntil] = useState<Dayjs | null>(null);
  const [frequency, setFrequency] = useState<EventRecurrenceFrequency>('WEEKLY');
  const [interval, setInterval] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<EventRecurrenceWeekday[]>([]);
  const scheduleTimezone = useMemo(() => resolveEventScheduleTimezone(value), [value?.timezone]);
  const stateSnapshotRef = useRef({
    daysOfWeek,
    endDateTime,
    eventType,
    frequency,
    interval,
    repeatUntil,
    startDateTime,
  });

  stateSnapshotRef.current = {
    daysOfWeek,
    endDateTime,
    eventType,
    frequency,
    interval,
    repeatUntil,
    startDateTime,
  };

  useEffect(() => {
    if (!restorePersistedState) {
      return;
    }

    const persisted = loadPersistedState();
    if (!persisted) {
      return;
    }

    setEventType(persisted.eventType);
    setFrequency(persisted.frequency);
    setInterval(persisted.interval);
    setDaysOfWeek(persisted.daysOfWeek);
  }, [restorePersistedState]);

  useEffect(() => {
    if (restorePersistedState || !value?.anchorStartAt) {
      return;
    }

    const parsedRule = parseEventRecurrenceRule(value.recurrenceRule);
    const anchorStart = dayjs(value.anchorStartAt);
    const durationMinutes = value.occurrenceDurationMinutes ?? 0;
    const nextStartDateTime = anchorStart.isValid() ? anchorStart : dayjs();
    const nextEndDateTime = anchorStart.isValid() ? anchorStart.add(durationMinutes, 'minute') : dayjs().add(1, 'hour');
    const nextDaysOfWeek =
      parsedRule.frequency === 'WEEKLY' && parsedRule.daysOfWeek.length === 0 && anchorStart.isValid()
        ? [getWeekdayFromDayjs(anchorStart)]
        : parsedRule.daysOfWeek;
    const nextRepeatUntil = parsedRule.untilToken ? parseRRuleUntilToken(parsedRule.untilToken) : null;
    const currentState = stateSnapshotRef.current;
    const matchesCurrentState =
      currentState.startDateTime?.toISOString() === nextStartDateTime.toISOString() &&
      currentState.endDateTime?.toISOString() === nextEndDateTime.toISOString() &&
      currentState.eventType === parsedRule.kind &&
      currentState.frequency === parsedRule.frequency &&
      currentState.interval === parsedRule.interval &&
      areSameDaySelections(currentState.daysOfWeek, nextDaysOfWeek) &&
      currentState.repeatUntil?.toISOString() === nextRepeatUntil?.toISOString();

    if (matchesCurrentState) {
      return;
    }

    setStartDateTime(nextStartDateTime);
    setEndDateTime(nextEndDateTime);
    setEventType(parsedRule.kind);
    setFrequency(parsedRule.frequency);
    setInterval(parsedRule.interval);
    setDaysOfWeek(nextDaysOfWeek);
    setRepeatUntil(nextRepeatUntil ? dayjs(nextRepeatUntil) : null);
  }, [restorePersistedState, value?.anchorStartAt, value?.occurrenceDurationMinutes, value?.recurrenceRule]);

  useEffect(() => {
    try {
      const state: PersistedRecurrenceState = { eventType, frequency, interval, daysOfWeek };
      localStorage.setItem(RECURRENCE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable (e.g. in SSR or private mode)
    }
  }, [daysOfWeek, eventType, frequency, interval]);

  useEffect(() => {
    if (!startDateTime || !endDateTime) {
      return;
    }

    if (!endDateTime.isAfter(startDateTime)) {
      setEndDateTime(startDateTime.add(1, 'hour'));
    }
  }, [endDateTime, startDateTime]);

  useEffect(() => {
    if (eventType !== 'recurring' || frequency !== 'WEEKLY' || !startDateTime || daysOfWeek.length > 0) {
      return;
    }

    setDaysOfWeek([getWeekdayFromDayjs(startDateTime)]);
  }, [daysOfWeek.length, eventType, frequency, startDateTime]);

  useEffect(() => {
    if (!startDateTime || !endDateTime) {
      return;
    }

    const occurrenceDurationMinutes = Math.max(0, endDateTime.diff(startDateTime, 'minute'));
    const recurrenceRule = buildEventRecurrenceRule({
      daysOfWeek:
        eventType === 'recurring' && frequency === 'WEEKLY'
          ? daysOfWeek.length > 0
            ? daysOfWeek
            : [getWeekdayFromDayjs(startDateTime)]
          : [],
      frequency,
      interval,
      kind: eventType,
      untilToken: eventType === 'recurring' ? formatRRuleUntilToken(repeatUntil?.toDate()) : null,
    });

    onChange(recurrenceRule, startDateTime.toDate(), scheduleTimezone, occurrenceDurationMinutes);
  }, [daysOfWeek, endDateTime, eventType, frequency, interval, onChange, repeatUntil, scheduleTimezone, startDateTime]);

  return (
    <Box>
      <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
        <EventRadioButtons
          selectedType={eventType}
          onChange={(nextValue) => setEventType(nextValue as 'single' | 'recurring')}
        />
      </FormControl>

      <Card elevation={0} sx={{ borderRadius: 2, p: 2, bgcolor: 'background.default' }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Start Date and Time"
                value={startDateTime}
                onChange={setStartDateTime}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label={eventType === 'recurring' ? 'Session End Date and Time' : 'End Date and Time'}
                minDateTime={startDateTime ?? undefined}
                value={endDateTime}
                onChange={setEndDateTime}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
              />
            </LocalizationProvider>
          </Grid>

          {eventType === 'recurring' ? (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth color="secondary">
                  <InputLabel color="secondary">Frequency</InputLabel>
                  <Select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as EventRecurrenceFrequency)}
                    color="secondary"
                    sx={{ borderRadius: 2 }}
                  >
                    {EVENT_RECURRENCE_FREQUENCIES.map((option) => (
                      <MenuItem key={option} value={option}>
                        {FREQUENCY_LABELS[option]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Interval"
                  type="number"
                  value={interval}
                  onChange={(event) => setInterval(normalizeRecurrenceInterval(event.target.value))}
                  color="secondary"
                  slotProps={{ htmlInput: { min: 1 } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Repeat Until (Optional)"
                    minDateTime={startDateTime ?? undefined}
                    value={repeatUntil}
                    onChange={setRepeatUntil}
                    slotProps={{
                      textField: {
                        helperText: 'Leave blank to keep the series open-ended.',
                      },
                    }}
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              {frequency === 'WEEKLY' ? (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Days of the Week
                  </Typography>
                  <Grid container spacing={1}>
                    {EVENT_RECURRENCE_WEEKDAYS.map((weekday) => (
                      <Grid key={weekday}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={daysOfWeek.includes(weekday)}
                              onChange={() => setDaysOfWeek((current) => toggleWeekday(current, weekday))}
                              color="primary"
                            />
                          }
                          label={WEEKDAY_LABELS[weekday]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              ) : null}
            </>
          ) : null}
        </Grid>
      </Card>
    </Box>
  );
}
