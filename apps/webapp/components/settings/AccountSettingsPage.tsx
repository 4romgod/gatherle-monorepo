'use client';

import React, { useActionState, useEffect, useState, useTransition } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Card,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { User } from '@/data/graphql/types/graphql';
import { updateUserProfileAction, deleteUserProfileAction } from '@/data/actions/server/user';
import { useAppContext } from '@/hooks/useAppContext';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';

interface AccountSettings {
  username: string;
  email: string;
}

export default function AccountSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const [updateUserFormState, updateUserFormAction] = useActionState(updateUserProfileAction, {});
  const [deleteUserFormState, deleteUserAction] = useActionState(deleteUserProfileAction, {});
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<AccountSettings>({
    username: user.username,
    email: user.email,
  });

  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Create a function to handle the delete confirmation
  const handleDeleteConfirm = async () => {
    setOpenDeleteAccountDialog(false);
    // Use startTransition to properly handle the async action
    startTransition(() => {
      deleteUserAction(new FormData());
    });
    await logoutUserAction();
  };

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'pt', label: 'Portuguese' },
  ];

  const timeZones = [
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
  ];

  useEffect(() => {
    if (updateUserFormState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: updateUserFormState.apiError,
      });
    }

    if (updateUserFormState.data) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'Account Settings updated successfully!',
      });
    }
  }, [updateUserFormState]);

  useEffect(() => {
    if (deleteUserFormState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: deleteUserFormState.apiError,
      });
    }

    if (deleteUserFormState.data) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'Account deleted successfully!',
      });
      // TODO: Redirect to login or home page after successful deletion
    }
  }, [deleteUserFormState]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="overline"
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
          }}
        >
          ACCOUNT
        </Typography>
        <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Account Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          Manage your account settings and preferences
        </Typography>
      </Box>

      <Stack spacing={3}>
        <Box component="form" action={updateUserFormAction} noValidate>
          {/* Account Details Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Account Details
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={settings.username}
                  onChange={handleInputChange}
                  variant="outlined"
                  slotProps={{
                    input: {
                      readOnly: true,
                    },
                  }}
                  color="secondary"
                  disabled
                  helperText="Your username cannot be changed"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={settings.email}
                  onChange={handleInputChange}
                  variant="outlined"
                  color="secondary"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Preferences Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Preferences
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel color="secondary">Language</InputLabel>
                  <Select
                    name="language"
                    // TODO value={settings.language}
                    onChange={e => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                    label="Language"
                    color="secondary"
                  >
                    {languages.map(lang => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel color="secondary">Time Zone</InputLabel>
                  <Select
                    name="timeZone"
                    // TODO value={settings.timeZone}
                    onChange={e => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                    label="Time Zone"
                    color="secondary"
                  >
                    {timeZones.map(zone => (
                      <MenuItem key={zone.value} value={zone.value}>
                        {zone.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={isPending}
              size="large"
              sx={{ ...BUTTON_STYLES, px: 4, width: { xs: '100%', sm: 'auto' } }}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>

        {/* Delete Account Section - Danger Zone */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '2px solid',
            borderColor: 'error.main',
            p: 3,
            bgcolor: theme => (theme.palette.mode === 'dark' ? 'error.dark' : 'error.lighter'),
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'error.main',
                color: 'white',
              }}
            >
              <DeleteIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600} color="error.main" gutterBottom>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Irreversible and destructive actions
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mb: 3, mt: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Delete Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Permanently remove your account and all associated data. This action cannot be undone and all your events,
              purchases, and profile information will be permanently deleted.
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setOpenDeleteAccountDialog(true)}
              disabled={isPending}
              size="large"
              sx={{
                ...BUTTON_STYLES,
                px: 3,
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Delete My Account
            </Button>
          </Box>

          {/* Delete Account Confirmation Dialog */}
          <Dialog
            open={openDeleteAccountDialog}
            onClose={() => setOpenDeleteAccountDialog(false)}
            PaperProps={{
              sx: {
                borderRadius: 3,
                p: 2,
              },
            }}
          >
            <DialogTitle sx={{ pb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'error.main',
                    color: 'white',
                  }}
                >
                  <DeleteIcon />
                </Box>
                <Typography variant="h5" fontWeight={600}>
                  Delete Account?
                </Typography>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you absolutely sure you want to permanently delete your account?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                This action will:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Permanently delete all your personal data
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Remove all your events and purchases
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Cancel any active subscriptions
                </Typography>
                <Typography component="li" variant="body2">
                  This action cannot be reversed
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
              <Button
                onClick={() => setOpenDeleteAccountDialog(false)}
                variant="outlined"
                disabled={isPending}
                size="large"
                sx={{ ...BUTTON_STYLES, px: 3 }}
              >
                Cancel
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                size="large"
                sx={{ ...BUTTON_STYLES, px: 3 }}
              >
                {isPending ? 'Deleting...' : 'Yes, Delete My Account'}
              </Button>
            </DialogActions>
          </Dialog>
        </Card>
      </Stack>
    </Box>
  );
}
