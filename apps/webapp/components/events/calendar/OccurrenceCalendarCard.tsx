'use client';

import Link from 'next/link';
import { Box, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import { CalendarTodayOutlined, LocationOnOutlined, PeopleOutline } from '@mui/icons-material';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import Surface from '@/components/core/Surface';
import { getOccurrenceStatusTone } from '@/components/account/organizer-session-utils';
import {
  getEventPreviewHref,
  getEventPreviewLocationText,
  getEventPreviewTitle,
} from '@/components/events/event-preview-utils';
import { formatOccurrenceSessionDate, formatOccurrenceTimeRange } from '@/components/events/date-utils';
import { EventOccurrenceStatus } from '@/data/graphql/types/graphql';
import { WEB_RADIUS } from '@/lib/constants/radius';

interface OccurrenceCalendarCardProps {
  event: EventOccurrencePreview;
  showDate?: boolean;
}

export default function OccurrenceCalendarCard({ event, showDate = false }: OccurrenceCalendarCardProps) {
  const theme = useTheme();
  const href = getEventPreviewHref(event);
  const location = getEventPreviewLocationText(event);
  const participantCount = event.rsvpCount ?? 0;
  const showStatusChip = event.status !== EventOccurrenceStatus.Scheduled;

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Surface
        disableShadow
        sx={{
          p: 1.5,
          borderRadius: WEB_RADIUS.control,
          bgcolor: alpha(theme.palette.primary.main, 0.025),
          transition: 'transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderColor: 'primary.light',
          },
        }}
      >
        <Stack spacing={1.1}>
          <Stack direction="row" spacing={1.25} justifyContent="space-between" alignItems="flex-start">
            <Box
              sx={{
                minWidth: 110,
                px: 1.1,
                py: 0.85,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.16),
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              }}
            >
              <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ lineHeight: 1.1 }}>
                {formatOccurrenceTimeRange(event.startAt, event.endAt, event.timezone)}
              </Typography>
              {showDate ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                  {formatOccurrenceSessionDate(event.startAt, event.timezone)}
                </Typography>
              ) : null}
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end" useFlexGap>
              {participantCount > 0 ? (
                <Chip
                  icon={<PeopleOutline sx={{ fontSize: 14 }} />}
                  label={`${participantCount} going`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700, bgcolor: 'background.paper' }}
                />
              ) : null}
              {showStatusChip ? (
                <Chip
                  label={event.status}
                  color={getOccurrenceStatusTone(event.status)}
                  size="small"
                  variant={event.status === EventOccurrenceStatus.Completed ? 'outlined' : 'filled'}
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
              {event.isException ? (
                <Chip label="Exception" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
              ) : null}
            </Stack>
          </Stack>

          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              {getEventPreviewTitle(event)}
            </Typography>
            {event.eventSeries?.summary ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.55,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {event.eventSeries.summary}
              </Typography>
            ) : null}
          </Box>

          <Stack spacing={0.55}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocationOnOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {location}
              </Typography>
            </Stack>
            {showDate ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarTodayOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {formatOccurrenceSessionDate(event.startAt, event.timezone)}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Surface>
    </Link>
  );
}
