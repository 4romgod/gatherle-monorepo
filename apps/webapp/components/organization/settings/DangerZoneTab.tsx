'use client';

import { Alert, Button, Stack, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';

interface DangerZoneTabProps {
  onDeleteClick: () => void;
  disabled?: boolean;
}

export default function DangerZoneTab({ onDeleteClick, disabled }: DangerZoneTabProps) {
  return (
    <Stack spacing={3}>
      <Alert severity="error">
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Danger Zone
        </Typography>
        <Typography variant="body2">
          Deleting an organization is permanent and cannot be undone. All events and data associated with this
          organization will be lost.
        </Typography>
      </Alert>

      <Button
        variant="outlined"
        color="error"
        startIcon={<Delete />}
        onClick={onDeleteClick}
        sx={{ fontWeight: 600, textTransform: 'none' }}
        disabled={disabled}
      >
        Delete Organization
      </Button>
    </Stack>
  );
}
