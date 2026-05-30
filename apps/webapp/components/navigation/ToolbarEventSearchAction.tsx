'use client';

import { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import EventSearchBar from '@/components/search/EventSearchBar';

type ToolbarEventSearchActionProps = {
  placeholder: string;
};

export default function ToolbarEventSearchAction({ placeholder }: ToolbarEventSearchActionProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <IconButton
        aria-label="Search events"
        onClick={() => setOpen(true)}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          height: 40,
          width: 40,
        }}
      >
        <Search />
      </IconButton>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: 'min(68vw, 280px)', sm: 320 } }}>
      <Box sx={{ flex: 1 }}>
        <EventSearchBar autoFocus fullWidth placeholder={placeholder} size="small" variant="outlined" />
      </Box>
      <IconButton
        aria-label="Close search"
        onClick={() => setOpen(false)}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          flexShrink: 0,
          height: 40,
          width: 40,
        }}
      >
        <Close />
      </IconButton>
    </Box>
  );
}
