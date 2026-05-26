'use client';

import React, { useActionState, useEffect, useState, useTransition } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { signIn, useSession } from 'next-auth/react';
import { useFormStatus } from 'react-dom';
import { deleteUserProfileAction, updateUserProfileAction } from '@/data/actions/server/user';
import { type User } from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';
import { useLogout } from '@/hooks/useLogout';
import { SETTINGS_PRIMARY_BUTTON_SX, SETTINGS_SECONDARY_BUTTON_SX, SettingsSection } from './SettingsSection';

interface AccountSettings {
  email: string;
  username: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      color="primary"
      disabled={pending}
      size="large"
      startIcon={pending ? <CircularProgress color="inherit" size={20} /> : undefined}
      sx={{ ...SETTINGS_PRIMARY_BUTTON_SX, width: { xs: '100%', sm: 'auto' } }}
      type="submit"
      variant="contained"
    >
      {pending ? 'Saving...' : 'Save account'}
    </Button>
  );
}

export default function AccountSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const theme = useTheme();
  const [updateUserFormState, updateUserFormAction] = useActionState(updateUserProfileAction, {});
  const [deleteUserFormState, deleteUserAction] = useActionState(deleteUserProfileAction, {});
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const { logout } = useLogout();
  const [settings, setSettings] = useState<AccountSettings>({
    email: user.email,
    username: user.username,
  });
  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    setSettings({
      email: session.user.email,
      username: session.user.username,
    });
  }, [session?.user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleDeleteConfirm = async () => {
    setOpenDeleteAccountDialog(false);
    startTransition(() => {
      deleteUserAction(new FormData());
    });
    await logout();
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

      setSettings({
        email: updatedUser.email,
        username: updatedUser.username,
      });

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
  }, [session, setToastProps, toastProps, updateUserFormState]);

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
  }, [deleteUserFormState, setToastProps, toastProps]);

  return (
    <Stack spacing={4}>
      <Box component="form" action={updateUserFormAction} noValidate>
        <Stack spacing={4}>
          <SettingsSection
            description="Account details stay close at hand. Changing your email will require reverification."
            title="Account"
          >
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  color="secondary"
                  disabled
                  fullWidth
                  id="account-username"
                  label="Username"
                  name="username"
                  slotProps={{
                    input: {
                      readOnly: true,
                    },
                  }}
                  value={settings.username}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  color="secondary"
                  fullWidth
                  id="account-email"
                  label="Email address"
                  name="email"
                  onChange={handleInputChange}
                  type="email"
                  value={settings.email}
                />
              </Grid>
            </Grid>
          </SettingsSection>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
            <SubmitButton />
          </Stack>
        </Stack>
      </Box>

      <Card
        elevation={0}
        sx={{
          bgcolor: (currentTheme) => (currentTheme.palette.mode === 'dark' ? 'error.dark' : 'error.lighter'),
          border: '2px solid',
          borderColor: 'error.main',
          borderRadius: 4,
          overflow: 'visible',
          p: { xs: 2.5, sm: 3 },
        }}
      >
        <Stack spacing={3}>
          <SettingsSection
            description="Permanently remove your account and all associated data. This action cannot be undone."
            title="Danger zone"
            tone="danger"
          >
            <Button
              color="error"
              disabled={isPending}
              onClick={() => setOpenDeleteAccountDialog(true)}
              size="large"
              startIcon={<DeleteIcon />}
              sx={{
                ...SETTINGS_SECONDARY_BUTTON_SX,
                alignSelf: 'flex-start',
                width: { xs: '100%', sm: 'auto' },
                ...(theme.palette.mode === 'dark'
                  ? {
                      color: theme.palette.error.contrastText,
                      borderColor: theme.palette.error.contrastText,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.error.contrastText, 0.15),
                        borderColor: theme.palette.error.contrastText,
                      },
                    }
                  : {}),
              }}
              variant="outlined"
            >
              Delete my account
            </Button>
          </SettingsSection>
        </Stack>

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
            <Stack alignItems="center" direction="row" spacing={2}>
              <Box
                sx={{
                  alignItems: 'center',
                  bgcolor: 'error.main',
                  borderRadius: 2,
                  color: 'white',
                  display: 'flex',
                  height: 48,
                  justifyContent: 'center',
                  width: 48,
                }}
              >
                <DeleteIcon />
              </Box>
              <Typography fontWeight={600} variant="h5">
                Delete account?
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }} variant="body1">
              Are you absolutely sure you want to permanently delete your account?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }} variant="body2">
              This action will:
            </Typography>
            <Box component="ul" sx={{ color: 'text.secondary', pl: 3 }}>
              <Typography component="li" sx={{ mb: 0.5 }} variant="body2">
                Permanently delete all your personal data
              </Typography>
              <Typography component="li" sx={{ mb: 0.5 }} variant="body2">
                Remove all your events and purchases
              </Typography>
              <Typography component="li" sx={{ mb: 0.5 }} variant="body2">
                Cancel any active subscriptions
              </Typography>
              <Typography component="li" variant="body2">
                This action cannot be reversed
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ gap: 1, pb: 2, px: 3 }}>
            <Button
              disabled={isPending}
              onClick={() => setOpenDeleteAccountDialog(false)}
              sx={SETTINGS_SECONDARY_BUTTON_SX}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              color="error"
              disabled={isPending}
              onClick={handleDeleteConfirm}
              sx={SETTINGS_PRIMARY_BUTTON_SX}
              variant="contained"
            >
              {isPending ? 'Deleting...' : 'Yes, delete my account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Stack>
  );
}
