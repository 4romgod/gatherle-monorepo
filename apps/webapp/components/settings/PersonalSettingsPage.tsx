'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
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

interface PersonalSettings {
  language: string;
  timeZone: string;
  privateProfile: boolean;
  showEmail: boolean;
  showPhoneNumber: boolean;
  phoneNumber: string;
}

export default function PersonalSettingsPage() {
  const [settings, setSettings] = useState<PersonalSettings>({
    language: 'en',
    timeZone: 'America/New_York',
    privateProfile: false,
    showEmail: true,
    showPhoneNumber: false,
    phoneNumber: ''
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

  const handleSave = () => {
    // TODO: Implement actual save logic (API call, etc.)
    console.log('Personal settings saved:', settings);
  };

  const genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
            <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
      <Typography variant="h4" fontWeight='bold' sx={{ mb: 5 }}>
        Personal Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{xs: 12}}>
          <FormControl fullWidth margin="normal">
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale="en"
            >
              <DatePicker
                label="Date of Birth"
                format="YYYY-MM-DD"
                name="birthdate"
              />
            </LocalizationProvider>
          </FormControl>
        </Grid>
        <Grid size={{xs: 12}}>
          <FormControl fullWidth variant="outlined">
            <InputLabel
              color='secondary'
            >
              Gender
            </InputLabel>
            <Select
              name="gender"
              // TODO value={settings.gender}
              onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
              label="Gender"
              color="secondary"
            >
              {genders.map((gender) => (
                <MenuItem key={gender.value} value={gender.value}>
                  {gender.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{xs: 12}}>
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
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </Box>
      </Paper>
    </Box>
  );
};
