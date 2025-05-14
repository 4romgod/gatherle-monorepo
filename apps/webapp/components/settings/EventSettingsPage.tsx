'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Alert
} from '@mui/material';

interface EventSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  eventRecommendations: boolean;
  maxDistanceForEvents: number;
  preferredEventTypes: string[];
  eventFrequency: 'daily' | 'weekly' | 'monthly';
}

export default function EventSettingsPage() {
  const [settings, setSettings] = useState<EventSettings>({
    emailNotifications: true,
    pushNotifications: false,
    eventRecommendations: true,
    maxDistanceForEvents: 50, // miles
    preferredEventTypes: ['Technology', 'Professional Development'],
    eventFrequency: 'weekly'
  });

  const handleToggleChange = (name: keyof EventSettings) => {
    setSettings(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setSettings(prev => ({
      ...prev,
      maxDistanceForEvents: newValue as number
    }));
  };

  const handleEventTypeToggle = (type: string) => {
    setSettings(prev => ({
      ...prev,
      preferredEventTypes: prev.preferredEventTypes.includes(type)
        ? prev.preferredEventTypes.filter(t => t !== type)
        : [...prev.preferredEventTypes, type]
    }));
  };

  const handleSave = () => {
    // TODO: Implement actual save logic (API call, etc.)
    console.log('Event settings saved:', settings);
  };

  // TODO These events should be the ones chosen by user (on interests page)
  const eventTypes = [
    'Technology', 'Professional Development', 'Sports',
    'Arts', 'Networking', 'Social', 'Fitness', 'Learning'
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
      <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
        <Typography variant="h4" fontWeight='bold' sx={{ mb: 5 }}>
          Event Preferences
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Notification Preferences
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={() => handleToggleChange('emailNotifications')}
                  color="secondary"
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.pushNotifications}
                  onChange={() => handleToggleChange('pushNotifications')}
                  color="secondary"
                />
              }
              label="Push Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.eventRecommendations}
                  onChange={() => handleToggleChange('eventRecommendations')}
                  color="secondary"
                />
              }
              label="Event Recommendations"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Event Discovery
            </Typography>
            <Box sx={{ px: 2 }}>
              <Typography gutterBottom>
                Maximum Distance for Events: {settings.maxDistanceForEvents} miles
              </Typography>
              <Slider
                value={settings.maxDistanceForEvents}
                onChange={handleSliderChange}
                valueLabelDisplay="auto"
                step={5}
                marks
                min={5}
                max={100}
                color='secondary'
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel color='secondary'>Event Notification Frequency</InputLabel>
              <Select
                value={settings.eventFrequency}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  eventFrequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                }))}
                label="Event Notification Frequency"
                color='secondary'
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Preferred Event Types
            </Typography>
            <Grid container spacing={1}>
              {eventTypes.map((type) => (
                <Grid size={{ xs: 6, sm: 4 }} key={type}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.preferredEventTypes.includes(type)}
                        onChange={() => handleEventTypeToggle(type)}
                        color="secondary"
                      />
                    }
                    label={type}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mt: 2 }}>
              These settings help us personalize your event recommendations and
              notification preferences.
            </Alert>
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
