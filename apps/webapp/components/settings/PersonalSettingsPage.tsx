'use client';

import React, { useActionState, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Card,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Save as SaveIcon } from '@mui/icons-material';
import { Gender, User } from '@/data/graphql/types/graphql';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { useAppContext } from '@/hooks/useAppContext';
import dayjs from 'dayjs';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';

interface PersonalSettings {
  privateProfile: boolean;
  showEmail: boolean;
  showPhoneNumber: boolean;
  birthdate: string;
  gender: Gender | null;
}

export default function PersonalSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const [settings, setSettings] = useState<PersonalSettings>({
    privateProfile: false,
    showEmail: true,
    showPhoneNumber: false,
    birthdate: user.birthdate,
    gender: user.gender || null,
  });

  const handleToggleChange = (name: keyof PersonalSettings) => {
    setSettings(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    setLoading(false);

    if (formState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: formState.apiError,
      });
    }

    if (formState.data) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'Personal Settings updated successfully!',
      });
    }
  }, [formState]);

  return (
    <Box>
      <Stack spacing={3}>
        {/* Page Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Personal Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
            Manage your personal information and privacy preferences
          </Typography>
        </Box>

        <Box component="form" action={formAction} noValidate>
          {/* Personal Details */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Personal Details
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
                    <DatePicker
                      label="Date of Birth"
                      format="YYYY-MM-DD"
                      name="birthdate"
                      value={dayjs(settings.birthdate)}
                      slotProps={{
                        textField: {
                          color: 'secondary',
                        },
                      }}
                    />
                  </LocalizationProvider>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel color="secondary">Gender</InputLabel>
                  <Select
                    name="gender"
                    value={settings.gender || ''}
                    onChange={e => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                    label="Gender"
                    color="secondary"
                  >
                    {Object.values(Gender).map(gender => (
                      <MenuItem key={gender} value={gender}>
                        {gender}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>

          {/* Privacy Settings */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Privacy Settings
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privateProfile}
                      onChange={() => handleToggleChange('privateProfile')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Private Profile
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Only you can see your profile information
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showEmail}
                      onChange={() => handleToggleChange('showEmail')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Show Email Address
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Allow other members to see your email
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showPhoneNumber}
                      onChange={() => handleToggleChange('showPhoneNumber')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Show Phone Number
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Allow other members to see your phone
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          </Card>

          {/* Action Button */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              color="primary"
              type="submit"
              size="large"
              sx={{ ...BUTTON_STYLES, px: 4, width: { xs: '100%', sm: 'auto' } }}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
