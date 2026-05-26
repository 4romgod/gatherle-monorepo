'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { Box, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { signIn, useSession } from 'next-auth/react';
import { useFormStatus } from 'react-dom';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { type User } from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';
import { SETTINGS_PRIMARY_BUTTON_SX, SettingsSection } from './SettingsSection';

interface CommunicationPrefs {
  emailEnabled: boolean;
  pushEnabled: boolean;
}

interface EventPreferences {
  communicationPrefs: CommunicationPrefs;
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
      {pending ? 'Saving...' : 'Save alerts'}
    </Button>
  );
}

export default function EventSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<EventPreferences>({
    communicationPrefs: {
      emailEnabled: user.preferences?.communicationPrefs?.emailEnabled ?? true,
      pushEnabled: user.preferences?.communicationPrefs?.pushEnabled ?? false,
    },
  });

  useEffect(() => {
    if (!session?.user?.preferences) {
      return;
    }

    setPreferences({
      communicationPrefs: {
        emailEnabled: session.user.preferences.communicationPrefs?.emailEnabled ?? true,
        pushEnabled: session.user.preferences.communicationPrefs?.pushEnabled ?? false,
      },
    });
  }, [session?.user]);

  useEffect(() => {
    if (formState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: formState.apiError,
      });
    }

    if (formState.data && session?.user?.token) {
      const updatedUser = formState.data as User;

      setPreferences({
        communicationPrefs: {
          emailEnabled: updatedUser.preferences?.communicationPrefs?.emailEnabled ?? true,
          pushEnabled: updatedUser.preferences?.communicationPrefs?.pushEnabled ?? false,
        },
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
        message: 'Alert preferences updated successfully!',
      });
    }
  }, [formState, session, setToastProps, toastProps]);

  const handleToggleChange = (field: keyof CommunicationPrefs) => {
    setPreferences((previous) => ({
      ...previous,
      communicationPrefs: {
        ...previous.communicationPrefs,
        [field]: !previous.communicationPrefs[field],
      },
    }));
  };

  return (
    <Box component="form" action={formAction} noValidate>
      <input type="hidden" name="preferences" value={JSON.stringify(preferences)} />

      <Stack spacing={4}>
        <SettingsSection description="How Gatherle should reach you when something matters." title="Communication">
          <Stack spacing={2}>
            <Box sx={{ py: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.communicationPrefs.emailEnabled}
                    color="secondary"
                    id="email-notifications"
                    onChange={() => handleToggleChange('emailEnabled')}
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight={600} variant="body1">
                      Email updates
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                      Receive invites, reminders, and important account changes via email.
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Box sx={{ py: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.communicationPrefs.pushEnabled}
                    color="secondary"
                    id="push-notifications"
                    onChange={() => handleToggleChange('pushEnabled')}
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight={600} variant="body1">
                      Push notifications
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                      Prepare for future native push alerts when event activity needs immediate attention.
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Stack>
        </SettingsSection>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
          <SubmitButton />
        </Stack>
      </Stack>
    </Box>
  );
}
