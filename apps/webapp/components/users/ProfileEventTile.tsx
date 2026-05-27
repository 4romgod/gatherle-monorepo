'use client';

import Link from 'next/link';
import { alpha, Box, Chip, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import RemoteImage from '@/components/core/RemoteImage';
import {
  AnyEventPreview,
  getEventPreviewHref,
  getEventPreviewImageUrl,
  getEventPreviewStartAt,
  getEventPreviewStatusLabel,
  getEventPreviewTitle,
} from '@/components/events/event-preview-utils';

interface ProfileEventTileProps {
  event: AnyEventPreview;
}

function formatTileDate(startAt: string | Date | null) {
  if (!startAt) {
    return 'Date to be confirmed';
  }

  const date = startAt instanceof Date ? startAt : new Date(startAt);
  if (Number.isNaN(date.getTime())) {
    return 'Date to be confirmed';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(date);
}

export default function ProfileEventTile({ event }: ProfileEventTileProps) {
  const title = getEventPreviewTitle(event);
  const href = getEventPreviewHref(event);
  const imageUrl = getEventPreviewImageUrl(event);
  const statusLabel = getEventPreviewStatusLabel(event) ?? 'Upcoming';
  const dateLabel = formatTileDate(getEventPreviewStartAt(event));

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        aspectRatio: '16 / 9',
        borderRadius: { xs: 2, md: 2.5 },
        overflow: 'hidden',
        position: 'relative',
        display: 'block',
        textDecoration: 'none',
        bgcolor: 'background.paper',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[6],
        },
      }}
    >
      <RemoteImage
        alt={title}
        fallback={
          <Box
            sx={(theme) => ({
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.42)} 0%, ${alpha(
                theme.palette.secondary.light,
                0.4,
              )} 100%)`,
              color: 'common.white',
            })}
          >
            <EventIcon sx={{ fontSize: 40, opacity: 0.82 }} />
          </Box>
        }
        src={imageUrl}
        sx={{ width: '100%', height: '100%' }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.08) 42%, rgba(15,23,42,0.82) 100%)',
        }}
      />

      <Chip
        label={statusLabel}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1,
          height: 22,
          borderRadius: 999,
          bgcolor: 'background.paper',
          color: 'primary.main',
          border: '1px solid',
          borderColor: 'divider',
          fontWeight: 700,
          fontSize: '0.62rem',
          letterSpacing: 0.15,
          textTransform: 'uppercase',
          '& .MuiChip-label': {
            px: 1,
          },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          zIndex: 1,
        }}
      >
        <Typography
          sx={{
            color: 'common.white',
            fontSize: { xs: '0.82rem', md: '0.9rem' },
            fontWeight: 700,
            lineHeight: 1.2,
            textShadow: '0 1px 4px rgba(15,23,42,0.84)',
            display: '-webkit-box',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            color: 'rgba(255,255,255,0.82)',
            fontSize: '0.72rem',
            fontWeight: 500,
            textShadow: '0 1px 3px rgba(15,23,42,0.84)',
          }}
        >
          {dateLabel}
        </Typography>
      </Box>
    </Box>
  );
}
