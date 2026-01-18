'use client';

import React, { useActionState, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Stack,
  Card,
  CircularProgress,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { User } from '@/data/graphql/types/graphql';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { useAppContext } from '@/hooks/useAppContext';
import { signIn, useSession } from 'next-auth/react';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import { useFormStatus } from 'react-dom';

interface CommunicationPrefs {
  emailEnabled: boolean;
  pushEnabled: boolean;
}

interface EventPreferences {
  communicationPrefs: CommunicationPrefs;
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

export default function EventSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const { data: session } = useSession();

  // Initialize from user.preferences or defaults
  const [preferences, setPreferences] = useState<EventPreferences>({
    communicationPrefs: {
      emailEnabled: user.preferences?.communicationPrefs?.emailEnabled ?? true,
      pushEnabled: user.preferences?.communicationPrefs?.pushEnabled ?? false,
    },
  });

  // Sync local state with session when it updates
  useEffect(() => {
    if (session?.user?.preferences) {
      setPreferences({
        communicationPrefs: {
          emailEnabled: session.user.preferences?.communicationPrefs?.emailEnabled ?? true,
          pushEnabled: session.user.preferences?.communicationPrefs?.pushEnabled ?? false,
        },
      });
    }
  }, [session?.user?.preferences]);

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

      // Update local state immediately
      setPreferences({
        communicationPrefs: {
          emailEnabled: updatedUser.preferences?.communicationPrefs?.emailEnabled ?? true,
          pushEnabled: updatedUser.preferences?.communicationPrefs?.pushEnabled ?? false,
        },
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
        message: 'Event preferences updated successfully!',
      });
    }
  }, [formState]);

  const handleToggleChange = (field: keyof CommunicationPrefs) => {
    setPreferences(prev => ({
      ...prev,
      communicationPrefs: {
        ...prev.communicationPrefs,
        [field]: !prev.communicationPrefs[field],
      },
    }));
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Event Preferences
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          Customize how you receive notifications about events
        </Typography>
      </Box>

      <Box component="form" action={formAction} noValidate>
        {/* Hidden input for preferences JSON */}
        <input type="hidden" name="preferences" value={JSON.stringify(preferences)} />

        <Stack spacing={3}>
          {/* Communication Preferences */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Communication Preferences
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      id="email-notifications"
                      checked={preferences.communicationPrefs.emailEnabled}
                      onChange={() => handleToggleChange('emailEnabled')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Email Notifications
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Receive event updates, reminders, and recommendations via email
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      id="push-notifications"
                      checked={preferences.communicationPrefs.pushEnabled}
                      onChange={() => handleToggleChange('pushEnabled')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Push Notifications
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Get instant notifications on your device for event updates
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          </Card>

          {/* Info Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>Looking to manage your event interests?</strong> Visit the{' '}
              <Typography component="span" color="primary.main" fontWeight={600}>
                Interests
              </Typography>{' '}
              tab to customize the types of events you want to see.
            </Typography>
          </Card>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mt: 3 }}>
          <SubmitButton />
        </Stack>
      </Box>
    </Box>
  );
}

