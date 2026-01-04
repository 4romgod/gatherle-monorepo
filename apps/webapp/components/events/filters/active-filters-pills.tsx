"use client";

import { Stack, Chip } from '@mui/material';
import { EventStatus } from '@/data/graphql/types/graphql';

interface ActiveFiltersPillsProps {
  categories: string[];
  statuses: EventStatus[];
  onRemoveCategory: (category: string) => void;
  onRemoveStatus: (status: EventStatus) => void;
}

export default function ActiveFiltersPills({
  categories,
  statuses,
  onRemoveCategory,
  onRemoveStatus,
}: ActiveFiltersPillsProps) {
  if (categories.length === 0 && statuses.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
