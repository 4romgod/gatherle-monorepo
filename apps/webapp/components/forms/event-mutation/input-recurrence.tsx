'use client'

import React, { useState, useEffect } from 'react';
import { Typography, FormControl, InputLabel, Select, MenuItem, TextField, Checkbox, FormControlLabel, Grid, SelectChangeEvent } from '@mui/material';
import { ALL_WEEKDAYS, Frequency, Options, RRule, Weekday, WeekdayStr } from 'rrule';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { RecurrenceInputProps } from '@/lib/constants';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

export default function RecurrenceInput({ onChange }: RecurrenceInputProps) {
  const [startDateTime, setStartDateTime] = useState<Dayjs | null>(dayjs());
  const [endDateTime, setEndDateTime] = useState<Dayjs | null>(dayjs().add(1, 'hour'));
  const [frequency, setFrequency] = useState<Frequency>(Frequency.WEEKLY);
  const [interval, setInterval] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<WeekdayStr[]>([]);

  useEffect(() => {
    if (startDateTime) {
      generateRRule(frequency, interval, endDateTime, daysOfWeek);
    }
  }, [startDateTime, frequency, interval, endDateTime, daysOfWeek]);

  const handleFrequencyChange = (event: SelectChangeEvent<Frequency>) => {
    setFrequency(event.target.value as Frequency);
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setInterval(value);
  };

  const handleDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setDaysOfWeek((prevDays) => checked ? [...prevDays, value as WeekdayStr] : prevDays.filter((day) => day !== value));
  };

  const generateRRule = (freq: Frequency, interval: number, end: Dayjs | null, days: WeekdayStr[]) => {
    const options: Partial<Options> = {
      freq,
      interval,
      dtstart: startDateTime?.toDate(),
      until: end?.toDate(),
      byweekday: days.map((day) => Weekday.fromStr(day)),
    };

    const rule = new RRule(options);
    onChange(rule.toString());
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5">Recurrence Rule</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Start Date and Time"
            value={startDateTime}
            onChange={(newValue) => setStartDateTime(newValue)}
            sx={{ width: '100%' }}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} sm={6}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="End Date and Time"
            value={endDateTime}
            onChange={(newValue) => setEndDateTime(newValue)}
            sx={{ width: '100%' }}
          />
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Frequency</InputLabel>
          <Select value={frequency} onChange={handleFrequencyChange}>
            <MenuItem value={Frequency.DAILY}>Daily</MenuItem>
            <MenuItem value={Frequency.WEEKLY}>Weekly</MenuItem>
            <MenuItem value={Frequency.MONTHLY}>Monthly</MenuItem>
            <MenuItem value={Frequency.YEARLY}>Yearly</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Interval"
          type="number"
          value={interval}
          onChange={handleIntervalChange}
        />
      </Grid>
      {frequency === Frequency.WEEKLY && (
        <Grid item xs={12}>
          <Typography variant="body1">Days of the Week</Typography>
          <Grid container spacing={1}>
            {ALL_WEEKDAYS.map((day) => (
              <Grid item key={day}>
                <FormControlLabel
                  control={
                    <Checkbox
                      value={day}
                      checked={daysOfWeek.includes(day)}
                      onChange={handleDayChange}
                    />
                  }
                  label={day}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};
