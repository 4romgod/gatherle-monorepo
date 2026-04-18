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

// TODO: persist the recurrence rule in local storage
// TODO: add date like in AddressInput
export default function EventDateInput({ onChange }: EventDateInputProps) {
  const [eventType, setEvent] = useState<string>('single');
  const [startDateTime, setStartDateTime] = useState<Dayjs | null>(dayjs());
  const [endDateTime, setEndDateTime] = useState<Dayjs | null>(dayjs().add(1, 'hour'));

  const [frequency, setFrequency] = useState<Frequency>(Frequency.WEEKLY);
  const [interval, setInterval] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<WeekdayStr[]>([]);

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
        <EventRadioButtons selectedType={eventType} onChange={setEvent} />
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
