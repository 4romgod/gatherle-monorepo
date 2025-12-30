'use client';

import { Button, Paper, Stack, Typography, Box } from '@mui/material';
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import dayjs, { Dayjs } from 'dayjs';
import { useEventFilters } from './event-filter-context';

export default function DateFilter() {
  const { filters, setDateRange } = useEventFilters();

  const handleDateChange = (date: Dayjs | null) => {
    if (date) {
      setDateRange(date, date.add(7, 'day'));
    }
  };

  const handleQuickSelect = (type: 'week' | 'nextWeek' | 'month') => {
    const today = dayjs();
    let start: Dayjs;
    let end: Dayjs;

    switch (type) {
      case 'week':
        start = today.startOf('week');
        end = today.endOf('week');
        break;
      case 'nextWeek':
        start = today.add(1, 'week').startOf('week');
        end = today.add(1, 'week').endOf('week');
        break;
      case 'month':
        start = today.startOf('month');
        end = today.endOf('month');
        break;
    }

    setDateRange(start, end);
  };

  const handleClearDate = () => {
    setDateRange(null, null);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={2} px={1}>
        <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={600}>
          Date Range
        </Typography>
      </Stack>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
        <DateCalendar
          value={filters.dateRange.start}
          onChange={handleDateChange}
          sx={{
            '& .MuiPickersDay-root': {
              borderRadius: 1.5,
            },
            '& .MuiPickersDay-root.Mui-selected': {
              bgcolor: 'primary.main',
            },
          }}
        />
      </LocalizationProvider>
      <Stack direction="column" spacing={1} p={2}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => handleQuickSelect('week')}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            This Week
          </Button>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => handleQuickSelect('nextWeek')}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Next Week
          </Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => handleQuickSelect('month')}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            This Month
          </Button>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            color="secondary"
            onClick={handleClearDate}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Clear
          </Button>
        </Stack>
      </Stack>
      {filters.dateRange.start && filters.dateRange.end && (
        <Box px={2} pb={1}>
          <Typography variant="caption" color="text.secondary">
            {filters.dateRange.start.format('MMM D')} - {filters.dateRange.end.format('MMM D, YYYY')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
