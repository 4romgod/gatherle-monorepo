'use client'

import React, { useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Chip, Typography, SelectChangeEvent } from '@mui/material';
import { EventStatus } from '@/data/graphql/types/graphql';
import { StatusFilterProps } from '@/lib/constants';

export default function StatusFilter({ sxProps }: StatusFilterProps) {
  const [statuses, setStatuses] = useState<string[]>([]);

  const handleStatusChange = (event: SelectChangeEvent<string[]>) => {
    const selectedStatuses = event.target.value as string[];
    setStatuses(selectedStatuses);
  };

  return (
    <FormControl fullWidth sx={{ ...sxProps }} size='small'>
      <InputLabel id="status-label">Statuses</InputLabel>
      <Select
        labelId="status-label"
        multiple
        value={statuses}
        onChange={handleStatusChange}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip key={value} label={value} />
            ))}
          </Box>
        )}
        sx={{
          backgroundColor: 'background.paper'
        }}
      >
        {Object.values(EventStatus).map((status) => {
          return (
            <MenuItem key={status} value={status}>
              <Box
                component="div"
                sx={{
                  display: 'flex',
                  px: 2,
                }}
              >
                <Typography variant='body1' pl={1}>{status}</Typography>
              </Box>
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  );
};
