'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Button, Card, CardContent, CircularProgress, Stack, Typography, Alert } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { ClearAllSessionStatesDocument } from '@/data/graphql/mutation/SessionState/mutation';
import { getAuthHeader } from '@/lib/utils/auth';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

interface SessionStateSettingsProps {
  token?: string;
}

export default function SessionStateSettings({ token }: SessionStateSettingsProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [clearAllSessionStates, { loading, error }] = useMutation(ClearAllSessionStatesDocument, {
    context: { headers: getAuthHeader(token) },
    onCompleted: () => {
      setSuccessMessage(
        'All session states have been cleared. Your tabs, filters, and drafts will reset on next reload.',
      );
      setConfirmDialogOpen(false);

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  const handleClearAll = () => {
    setConfirmDialogOpen(true);
  };

  const confirmClear = () => {
    clearAllSessionStates();
  };

  return (
    <Card elevation={0} sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Session State Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your persisted session data including saved filters, tab selections, and form drafts.
            </Typography>
          </Box>

          {successMessage && (
            <Alert severity="success" onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          {error && <Alert severity="error">Failed to clear session states: {error.message}</Alert>}

          <Stack spacing={2}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={600}>
                  What is session state?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Session state includes your selected tabs (like admin console tabs), active filters on the events
                  page, and any draft content in forms. This data syncs across your devices so your preferences follow
                  you.
                </Typography>
              </Stack>
            </Box>

            <Box
              sx={{
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Why reset session state?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  If you're experiencing issues with persisted data (stuck filters, incorrect tabs, or corrupted
                  drafts), clearing your session state can resolve these problems. Your account data remains safe - only
                  UI preferences are reset.
                </Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="error"
                startIcon={loading ? <CircularProgress size={16} /> : <Delete />}
                onClick={handleClearAll}
                disabled={loading}
              >
                Reset all session data
              </Button>
            </Stack>
          </Stack>
        </Stack>

        <ConfirmDialog
          open={confirmDialogOpen}
          title="Reset all session data?"
          description="This will clear all your saved filters, tab selections, and form drafts. Your account data and events remain safe. You'll need to reload the page to see changes."
          confirmLabel="Reset session data"
          onConfirm={confirmClear}
          onCancel={() => setConfirmDialogOpen(false)}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}
