'use client';

import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import { SxProps, Theme, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function SearchBar({
  itemList,
  sx,
  onSearch,
}: {
  itemList?: Array<string>;
  sx?: SxProps<Theme>;
  onSearch?: (query: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event: React.SyntheticEvent, value: string) => {
    setInputValue(value);
    onSearch?.(value);
  };

  return (
    <Stack spacing={2} sx={{ width: '100%', maxWidth: 600, ...sx }}>
      <Autocomplete
        freeSolo
        id="event-search"
        disableClearable
        options={itemList ?? []}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        renderInput={params => (
          <TextField
            {...params}
            label="Search events by title, description..."
            placeholder="Try 'music', 'festival', or 'workshop'"
            InputProps={{
              ...params.InputProps,
              type: 'search',
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
        )}
      />
    </Stack>
  );
}
