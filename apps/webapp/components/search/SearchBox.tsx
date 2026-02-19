'use client';

import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import { SxProps, Theme, InputAdornment } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';

export default function SearchBox({
  itemList,
  sx,
  onSearch,
  placeholder = "Try 'music', 'festival', or 'workshop'",
  ariaLabel = 'Search',
}: {
  itemList?: Array<string>;
  sx?: SxProps<Theme>;
  onSearch?: (query: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (_event: React.SyntheticEvent, value: string) => {
    setInputValue(value);
    onSearch?.(value);
  };

  return (
    <Stack spacing={2} sx={{ width: '100%', ...sx }}>
      <Autocomplete
        freeSolo
        id="event-search"
        disableClearable
        options={itemList ?? []}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            slotProps={{
              input: {
                ...params.InputProps,
                type: 'search',
                'aria-label': ariaLabel,
                startAdornment: (
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={(theme) => ({
              '& .MuiOutlinedInput-root': {
                borderRadius: 4,
                boxShadow:
                  theme.palette.mode === 'light' ? `0 1px 2px ${alpha(theme.palette.common.black, 0.08)}` : 'none',
                '& fieldset': {
                  borderColor:
                    theme.palette.mode === 'light'
                      ? alpha(theme.palette.text.primary, 0.2)
                      : alpha(theme.palette.common.white, 0.22),
                },
                '&:hover fieldset': {
                  borderColor:
                    theme.palette.mode === 'light'
                      ? alpha(theme.palette.text.primary, 0.35)
                      : alpha(theme.palette.common.white, 0.35),
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: 1,
                },
              },
              '& .MuiOutlinedInput-notchedOutline legend': {
                display: 'none',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                top: 0,
              },
              '& .MuiInputLabel-root': {
                display: 'none',
              },
            })}
          />
        )}
      />
    </Stack>
  );
}
