'use client';

import React, { useState, useEffect } from 'react';
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
import { ALL_WEEKDAYS, Frequency, RRule, Weekday, WeekdayStr } from 'rrule';
import dayjs, { Dayjs } from 'dayjs';
import EventRadioButtons from '@/components/buttons/EventTypeRadioButton';
import { EventDateInputProps } from '@/lib/constants';
import { z } from 'zod';

// TODO: add date like in AddressInput

const RECURRENCE_STORAGE_KEY = 'gatherle:eventDateInput';

const PersistedRecurrenceSchema = z.object({
  eventType: z.enum(['single', 'recurring']),
  frequency: z.nativeEnum(Frequency),
  interval: z.number().int().positive(),
  daysOfWeek: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const)),
});

type PersistedRecurrenceState = z.infer<typeof PersistedRecurrenceSchema>;

function loadPersistedState(): PersistedRecurrenceState | null {
  try {
    const raw = localStorage.getItem(RECURRENCE_STORAGE_KEY);
    if (!raw) return null;
    const result = PersistedRecurrenceSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export default function EventDateInput({ onChange }: EventDateInputProps) {
  const [eventType, setEvent] = useState<'single' | 'recurring'>('single');
  const [startDateTime, setStartDateTime] = useState<Dayjs | null>(dayjs());
  const [endDateTime, setEndDateTime] = useState<Dayjs | null>(dayjs().add(1, 'hour'));

  const [frequency, setFrequency] = useState<Frequency>(Frequency.WEEKLY);
  const [interval, setInterval] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<WeekdayStr[]>([]);

  // Restore persisted recurrence state on client mount only (avoids SSR hydration mismatch)
  useEffect(() => {
    const persisted = loadPersistedState();
    if (!persisted) return;
    setEvent(persisted.eventType);
    setFrequency(persisted.frequency);
    setInterval(persisted.interval);
    setDaysOfWeek(persisted.daysOfWeek);
  }, []);

  useEffect(() => {
    try {
      const state: PersistedRecurrenceState = { eventType, frequency, interval, daysOfWeek };
      localStorage.setItem(RECURRENCE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable (e.g. in SSR or private mode)
    }
  }, [eventType, frequency, interval, daysOfWeek]);

  useEffect(() => {
    if (!startDateTime || !endDateTime) return;

    let result = '';

    if (eventType === 'single') {
      // Treating a single event as a daily recurring rule with 1 occurrence
      const rule = new RRule({
        freq: Frequency.DAILY,
        interval: 1,
        dtstart: startDateTime.toDate(),
        until: endDateTime?.toDate(),
      });
      result = rule.toString();
    } else {
      const rule = new RRule({
        freq: frequency,
        interval,
        dtstart: startDateTime.toDate(),
        until: endDateTime.toDate(),
        byweekday: daysOfWeek.map((d) => Weekday.fromStr(d)),
      });
      result = rule.toString();
    }

    onChange(result, startDateTime.toDate(), Intl.DateTimeFormat().resolvedOptions().timeZone, endDateTime?.toDate());
  }, [eventType, startDateTime, endDateTime, frequency, interval, daysOfWeek]);

  const handleDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setDaysOfWeek((prev) => (checked ? [...prev, value as WeekdayStr] : prev.filter((day) => day !== value)));
  };

  return (
    <Box>
      <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
        <EventRadioButtons selectedType={eventType} onChange={(v) => setEvent(v as 'single' | 'recurring')} />
      </FormControl>

      {/* Date and Time Pickers */}
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
                label="End Date and Time"
                value={endDateTime}
                onChange={setEndDateTime}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
              />
            </LocalizationProvider>
          </Grid>

          {/* Recurring Event Settings */}
          {eventType === 'recurring' && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth color="secondary">
                  <InputLabel color="secondary">Frequency</InputLabel>
                  <Select
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value) as Frequency)}
                    color="secondary"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value={Frequency.DAILY}>Daily</MenuItem>
                    <MenuItem value={Frequency.WEEKLY}>Weekly</MenuItem>
                    <MenuItem value={Frequency.MONTHLY}>Monthly</MenuItem>
                    <MenuItem value={Frequency.YEARLY}>Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Interval"
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value))}
                  color="secondary"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              {frequency === Frequency.WEEKLY && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Days of the Week
                  </Typography>
                  <Grid container spacing={1}>
                    {ALL_WEEKDAYS.map((day) => (
                      <Grid key={day}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              value={day}
                              checked={daysOfWeek.includes(day)}
                              onChange={handleDayChange}
                              color="primary"
                            />
                          }
                          label={day}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </Card>
    </Box>
  );
}
