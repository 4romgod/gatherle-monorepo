'use client';

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  SelectChangeEvent,
  Paper,
  Stack,
  Typography,
  Checkbox,
  ListItemText,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { EventStatus } from '@/data/graphql/types/graphql';
import { StatusFilterProps } from '@/lib/constants';
import { useEventFilters } from './event-filter-context';

const STATUS_COLORS: Record<EventStatus, string> = {
  [EventStatus.Cancelled]: 'error.main',
  [EventStatus.Completed]: 'info.main',
  [EventStatus.Ongoing]: 'success.main',
  [EventStatus.Upcoming]: 'warning.main',
};

export default function StatusFilter({ sxProps }: StatusFilterProps) {
  const { filters, setStatuses } = useEventFilters();

  const handleStatusChange = (event: SelectChangeEvent<string[]>) => {
    const selectedStatuses = event.target.value as string[];
    setStatuses(selectedStatuses as EventStatus[]);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        ...sxProps,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <EventAvailableIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={600}>
          Event Status
        </Typography>
      </Stack>
      <FormControl fullWidth size="small">
        <InputLabel id="status-label">Select Status</InputLabel>
        <Select
          labelId="status-label"
          label="Select Status"
          multiple
          value={filters.statuses}
          onChange={handleStatusChange}
          renderValue={selected => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map(value => (
                <Chip
                  key={value}
                  label={value}
                  size="small"
                  sx={{
                    borderRadius: 1.5,
                    fontWeight: 500,
                    bgcolor: STATUS_COLORS[value],
                    color: 'white',
                  }}
                />
              ))}
            </Box>
          )}
          sx={{
            borderRadius: 1.5,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
          }}
        >
          {Object.values(EventStatus).map(status => {
            const isSelected = filters.statuses.includes(status);
            return (
              <MenuItem key={status} value={status}>
                <Checkbox checked={isSelected} size="small" />
                <ListItemText primary={status} />
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: STATUS_COLORS[status],
                    ml: 1,
                  }}
                />
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Paper>
  );
}
