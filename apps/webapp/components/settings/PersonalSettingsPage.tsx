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
  InputLabel
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Gender, User } from '@/data/graphql/types/graphql';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { useCustomAppContext } from '@/components/app-context';
import dayjs from "dayjs";

interface PersonalSettings {
  privateProfile: boolean;
  showEmail: boolean;
  showPhoneNumber: boolean;
  birthdate: string;
  gender: Gender | null;
}

export default function PersonalSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useCustomAppContext();
  const [loading, setLoading] = useState(false);
  const [formState, formAction] = useActionState(updateUserProfileAction, SERVER_ACTION_INITIAL_STATE);
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
      [name]: !prev[name]
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
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
    <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" fontWeight='bold' sx={{ mb: 5 }}>
        Personal Settings
      </Typography>

      <Box component="form" action={formAction} noValidate>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth margin="normal">
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale="en"
              >
                <DatePicker
                  label="Date of Birth"
                  format="YYYY-MM-DD"
                  name="birthdate"
                  value={dayjs(settings.birthdate)}
                />
              </LocalizationProvider>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel
                color='secondary'
              >
                Gender
              </InputLabel>
              <Select
                name="gender"
                value={settings.gender || ''}
                onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                label="Gender"
                color="secondary"
              >
                {Object.values(Gender).map((gender) => (
                  <MenuItem key={gender} value={gender}>
                    {gender}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Privacy Settings
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.privateProfile}
                  onChange={() => handleToggleChange('privateProfile')}
                  color="secondary"
                />
              }
              label="Private Profile"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showEmail}
                  onChange={() => handleToggleChange('showEmail')}
                  color="secondary"
                />
              }
              label="Show Email to Other Members"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showPhoneNumber}
                  onChange={() => handleToggleChange('showPhoneNumber')}
                  color="secondary"
                />
              }
              label="Show Phone Number to Other Members"
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
          >
            Save Changes
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
