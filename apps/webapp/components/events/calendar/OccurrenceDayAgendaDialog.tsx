'use client';

import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import OccurrenceCalendarCard from './OccurrenceCalendarCard';
import { WEB_RADIUS } from '@/lib/constants/radius';

interface OccurrenceDayAgendaDialogProps {
  dayLabel: string;
  occurrences: EventOccurrencePreview[];
  open: boolean;
  onClose: () => void;
}

export default function OccurrenceDayAgendaDialog({
  dayLabel,
  occurrences,
  open,
  onClose,
}: OccurrenceDayAgendaDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      slotProps={{
        paper: {
          sx: {
            borderRadius: fullScreen ? 0 : WEB_RADIUS.card,
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                Day agenda
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                {dayLabel}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`${occurrences.length} occurrence${occurrences.length === 1 ? '' : 's'}`}
                size="small"
                color={occurrences.length > 0 ? 'primary' : 'default'}
                variant={occurrences.length > 0 ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700 }}
              />
              <IconButton aria-label="Close day agenda" onClick={onClose} size="small">
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {occurrences.length > 0 ? (
            <Stack spacing={1.25}>
              {occurrences.map((occurrence) => (
                <OccurrenceCalendarCard key={`dialog-${occurrence.occurrenceId}`} event={occurrence} showDate={false} />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No events scheduled for this day yet.
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
