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
  Divider,
  Paper,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Save as SaveIcon } from '@mui/icons-material';
import { Gender, User } from '@/data/graphql/types/graphql';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { useAppContext } from '@/hooks/useAppContext';
import dayjs from 'dayjs';

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
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Personal Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your personal information and privacy preferences
          </Typography>
        </Box>

        <Box component="form" action={formAction} noValidate>
          {/* Personal Details */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Personal Details
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
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
          </Paper>

          {/* Privacy Settings */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Privacy Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Stack spacing={2}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
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
                      <Typography variant="body2" fontWeight={600}>
                        Private Profile
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Only you can see your profile information
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
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
                      <Typography variant="body2" fontWeight={600}>
                        Show Email Address
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allow other members to see your email
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
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
                      <Typography variant="body2" fontWeight={600}>
                        Show Phone Number
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allow other members to see your phone
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          </Paper>

          {/* Action Button */}
          <Stack direction="row" justifyContent="flex-end">
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              color="secondary"
              type="submit"
              sx={{ borderRadius: 2 }}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
