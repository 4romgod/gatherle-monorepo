"use client";

import { Stack, Chip } from '@mui/material';
import { CalendarMonth, LocationOn } from '@mui/icons-material';
import { EventStatus } from '@/data/graphql/types/graphql';

interface ActiveFiltersPillsProps {
  categories: string[];
  statuses: EventStatus[];
  dateLabel?: string | null;
  locationLabel?: string | null;
  onRemoveCategory: (category: string) => void;
  onRemoveStatus: (status: EventStatus) => void;
  onRemoveDate?: () => void;
  onRemoveLocation?: () => void;
}

export default function ActiveFiltersPills({
  categories,
  statuses,
  dateLabel,
  locationLabel,
  onRemoveCategory,
  onRemoveStatus,
  onRemoveDate,
  onRemoveLocation,
}: ActiveFiltersPillsProps) {
  const hasFilters = categories.length > 0 || statuses.length > 0 || !!dateLabel || !!locationLabel;
  
  if (!hasFilters) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {dateLabel && onRemoveDate && (
        <Chip 
          icon={<CalendarMonth sx={{ fontSize: 16 }} />}
          label={dateLabel} 
          size="small" 
          onDelete={onRemoveDate}
          color="info"
          variant="outlined"
          sx={{
            borderRadius: '50px',
            fontWeight: 600,
          }}
        />
      )}
      {locationLabel && onRemoveLocation && (
        <Chip 
          icon={<LocationOn sx={{ fontSize: 16 }} />}
          label={locationLabel} 
          size="small" 
          onDelete={onRemoveLocation}
          color="success"
          variant="outlined"
          sx={{
            borderRadius: '50px',
            fontWeight: 600,
          }}
        />
      )}
      {categories.map(cat => (
        <Chip 
          key={cat} 
          label={cat} 
          size="small" 
          onDelete={() => onRemoveCategory(cat)}
          color="primary"
          variant="outlined"
          sx={{
            borderRadius: '50px',
            fontWeight: 600,
          }}
        />
      ))}
      {statuses.map(status => (
        <Chip 
          key={status} 
          label={status} 
          size="small" 
          onDelete={() => onRemoveStatus(status)}
          color="secondary"
          variant="outlined"
          sx={{
            borderRadius: '50px',
            fontWeight: 600,
          }}
        />
      ))}
    </Stack>
  );
}
