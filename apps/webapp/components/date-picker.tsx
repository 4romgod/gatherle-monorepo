import { useState, useEffect } from 'react';
import { DemoItem } from '@mui/x-date-pickers/internals/demo';
import { BaseNonRangeNonStaticPickerProps } from '@mui/x-date-pickers/internals/models/props/basePickerProps';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

export type CustomDatePickerProps = BaseNonRangeNonStaticPickerProps;

export default function CustomDatePicker({ label, name, inputRef }: CustomDatePickerProps) {
  const [cleared, setCleared] = useState<boolean>(false);

  useEffect(() => {
    if (cleared) {
      const timeout = setTimeout(() => {
        setCleared(false);
      }, 1500);

      return () => clearTimeout(timeout);
    }
    return () => {};
  }, [cleared]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
        }}
      >
        <DemoItem label={label}>
          <DatePicker
            sx={{ width: 260 }}
            slotProps={{
              field: { clearable: true, onClear: () => setCleared(true) },
            }}
            name={name}
            inputRef={inputRef}
          />
        </DemoItem>

        {cleared && (
          <Alert sx={{ position: 'absolute', bottom: 0, right: 0 }} severity="success">
            Date cleared!
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
}
