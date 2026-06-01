'use client';

import Link from 'next/link';
import { Box, Chip, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import { EventOccurrenceStatus } from '@/data/graphql/types/graphql';
import { getEventPreviewHref, getEventPreviewTitle } from '@/components/events/event-preview-utils';

interface OccurrenceCalendarSnippetProps {
  event: EventOccurrencePreview;
  variant?: 'week' | 'month';
}

function resolveSnippetTone(status: EventOccurrenceStatus, theme: Theme) {
  switch (status) {
    case EventOccurrenceStatus.Cancelled:
      return {
        background: alpha(theme.palette.error.main, 0.08),
        border: alpha(theme.palette.error.main, 0.18),
        text: theme.palette.error.dark,
        accent: theme.palette.error.main,
      };
    case EventOccurrenceStatus.Completed:
      return {
        background: alpha(theme.palette.text.primary, 0.04),
        border: alpha(theme.palette.text.primary, 0.08),
        text: theme.palette.text.secondary,
        accent: theme.palette.text.disabled,
      };
    case EventOccurrenceStatus.Scheduled:
    default:
      return {
        background: alpha(theme.palette.primary.main, 0.08),
        border: alpha(theme.palette.primary.main, 0.18),
        text: theme.palette.text.primary,
        accent: theme.palette.primary.main,
      };
  }
}

function formatCompactStartTime(event: EventOccurrencePreview) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone ?? undefined,
  }).format(new Date(event.startAt));
}

export default function OccurrenceCalendarSnippet({ event, variant = 'month' }: OccurrenceCalendarSnippetProps) {
  const theme = useTheme();
  const href = getEventPreviewHref(event);
  const tone = resolveSnippetTone(event.status, theme);
  const timeLabel = formatCompactStartTime(event);
  const isWeekVariant = variant === 'week';

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Box
        sx={{
          px: isWeekVariant ? 1.1 : 0.9,
          py: isWeekVariant ? 0.95 : 0.72,
          borderRadius: isWeekVariant ? '12px' : '10px',
          backgroundColor: tone.background,
          border: '1px solid',
          borderColor: tone.border,
          borderLeft: '3px solid',
          borderLeftColor: tone.accent,
          transition: 'transform 0.16s ease, background-color 0.16s ease, border-color 0.16s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            borderColor: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
          },
        }}
      >
        <Stack spacing={0.35}>
          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.02em',
                color: tone.text,
                lineHeight: 1,
              }}
            >
              {timeLabel}
            </Typography>
            {event.isException ? (
              <Chip
                label="Ex"
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.common.white, 0.7),
                }}
              />
            ) : null}
          </Stack>
          <Typography
            variant={isWeekVariant ? 'body2' : 'caption'}
            sx={{
              fontWeight: isWeekVariant ? 700 : 600,
              color: 'text.primary',
              lineHeight: isWeekVariant ? 1.22 : 1.18,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: isWeekVariant ? 2 : 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {getEventPreviewTitle(event)}
          </Typography>
        </Stack>
      </Box>
    </Link>
  );
}
