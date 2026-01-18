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
  Stack,
  Card,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { User } from '@/data/graphql/types/graphql';
import { updateUserProfileAction, deleteUserProfileAction } from '@/data/actions/server/user';
import { useAppContext } from '@/hooks/useAppContext';
import { logoutUserAction } from '@/data/actions/server/auth/logout';
import { signIn, useSession } from 'next-auth/react';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import { useFormStatus } from 'react-dom';

interface AccountSettings {
  username: string;
  email: string;
}

// Separate submit button component to use useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button
      type="submit"
      variant="contained"
      color="primary"
      size="large"
      disabled={pending}
      startIcon={pending ? <CircularProgress size={20} color="inherit" /> : undefined}
      sx={{ ...BUTTON_STYLES, px: 4, width: { xs: '100%', sm: 'auto' } }}
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

export default function AccountSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const [updateUserFormState, updateUserFormAction] = useActionState(updateUserProfileAction, {});
  const [deleteUserFormState, deleteUserAction] = useActionState(deleteUserProfileAction, {});
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<AccountSettings>({
    username: user.username,
    email: user.email,
  });

  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);

  // Sync local state with session when it updates
  useEffect(() => {
    if (session?.user) {
      setSettings({
        username: session.user.username,
        email: session.user.email,
      });
    }
  }, [session?.user]);

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

  useEffect(() => {
    if (updateUserFormState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: updateUserFormState.apiError,
      });
    }

    if (updateUserFormState.data && session?.user?.token) {
      const updatedUser = updateUserFormState.data as User;
      
      // Update local state immediately
      setSettings({
        username: updatedUser.username,
        email: updatedUser.email,
      });
      
      // Refresh the session with updated user data
      signIn('refresh-session', {
        userData: JSON.stringify(updatedUser),
        token: session.user.token,
        redirect: false,
      });
      
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'Account settings updated successfully!',
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
    }
  }, [deleteUserFormState]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Account Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          Manage your account settings
        </Typography>
      </Box>

      <Stack spacing={3}>
        <Box component="form" action={updateUserFormAction} noValidate>
          {/* Account Details Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              p: { xs: 3, md: 4 },
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Account Details
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="account-username"
                  fullWidth
                  label="Username"
                  name="username"
                  value={settings.username}
                  variant="outlined"
                  slotProps={{
                    input: {
                      readOnly: true,
                    },
                  }}
                  color="secondary"
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="account-email"
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={settings.email}
                  onChange={handleInputChange}
                  variant="outlined"
                  color="secondary"
                />
              </Grid>
            </Grid>
          </Card>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
            <SubmitButton />
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
