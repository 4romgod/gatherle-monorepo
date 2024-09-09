'use client';

import { Button, Paper, Stack } from '@mui/material';
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

export default function DateFilter() {
    return (
        <Paper sx={{ backgroundColor: 'background.paper' }}>
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="en"
            >
                <DateCalendar />
            </LocalizationProvider>
            <Stack
                direction="row"
                spacing={2}
                py={2}
                justifyContent="center"
                alignItems="center"
            >
                <Button
                    variant="outlined"
                    size='small'
                    sx={{
                        color: 'secondary.main',
                        borderColor: 'secondary.main',
                        ':hover': {
                            color: 'text.primary',
                            borderColor: 'secondary.main',
                            backgroundColor: 'secondary.main',
                        }
                    }}
                >
                    This Week
                </Button>
                <Button
                    variant="outlined"
                    size='small'
                    sx={{
                        color: 'secondary.main',
                        borderColor: 'secondary.main',
                        ':hover': {
                            color: 'text.primary',
                            borderColor: 'secondary.main',
                            backgroundColor: 'secondary.main',
                        }
                    }}
                >
                    Next Week
                </Button>
                <Button
                    variant="outlined"
                    size='small'
                    sx={{
                        color: 'secondary.main',
                        borderColor: 'secondary.main',
                        ':hover': {
                            color: 'text.primary',
                            borderColor: 'secondary.main',
                            backgroundColor: 'secondary.main',
                        }
                    }}
                >
                    This Month
                </Button>
            </Stack>
        </Paper>
    )
}