'use client';

import { useEffect, useState } from 'react';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import { Close, Search } from '@mui/icons-material';

type ToolbarTextSearchActionProps = {
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  value: string;
};

export default function ToolbarTextSearchAction({
  onChange,
  onClear,
  placeholder,
  value,
}: ToolbarTextSearchActionProps) {
  const [open, setOpen] = useState(Boolean(value));

  useEffect(() => {
    if (value.length > 0) {
      setOpen(true);
    }
  }, [value]);

  if (!open) {
    return (
      <IconButton
        aria-label="Search"
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
      <TextField
        autoFocus
        fullWidth
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        size="small"
        value={value}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
          },
        }}
      />
      <IconButton
        aria-label="Close search"
        onClick={() => {
          onClear();
          setOpen(false);
        }}
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
