'use client';

import React, { useState } from 'react';
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
  Slider,
  Alert,
} from '@mui/material';
import { User } from '@/data/graphql/types/graphql';

interface EventSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  eventRecommendations: boolean;
  maxDistanceForEvents: number;
  preferredEvents: string[]; // Store category IDs
  eventFrequency: 'daily' | 'weekly' | 'monthly';
}

export default function EventSettingsPage({ user }: { user: User }) {
  const initialPreferredEvents = user.interests ? user.interests.map(interest => interest.eventCategoryId) : [];

  const [settings, setSettings] = useState<EventSettings>({
    emailNotifications: true,
    pushNotifications: false,
    eventRecommendations: true,
    maxDistanceForEvents: 50, // KM
    preferredEvents: initialPreferredEvents,
    eventFrequency: 'weekly',
  });

  const handleToggleChange = (name: keyof EventSettings) => {
    setSettings(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setSettings(prev => ({
      ...prev,
      maxDistanceForEvents: newValue as number,
    }));
  };

  const handleEventToggle = (categoryId: string) => {
    setSettings(prev => ({
      ...prev,
      preferredEvents: prev.preferredEvents.includes(categoryId)
        ? prev.preferredEvents.filter(id => id !== categoryId)
        : [...prev.preferredEvents, categoryId],
    }));
  };

  const handleSave = () => {
    // TODO: Implement actual save logic (API call, etc.)
    console.log('Event settings saved:', settings);
  };

  // Check if user has interests
  const hasInterests = user.interests && user.interests.length > 0;

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 5 }}>
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
            <Typography gutterBottom>Maximum Distance for Events: {settings.maxDistanceForEvents} miles</Typography>
            <Slider
              value={settings.maxDistanceForEvents}
              onChange={handleSliderChange}
              valueLabelDisplay="auto"
              step={5}
              marks
              min={5}
              max={100}
              color="secondary"
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel color="secondary">Event Notification Frequency</InputLabel>
            <Select
              value={settings.eventFrequency}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  eventFrequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                }))
              }
              label="Event Notification Frequency"
              color="secondary"
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

          {!hasInterests ? (
            <Typography variant="body2" color="textSecondary">
              You haven&apos;t selected any interests yet. Visit the Interests page to customize your event preferences.
            </Typography>
          ) : (
            <Grid container spacing={1}>
              {user.interests?.map(category => (
                <Grid size={{ xs: 6, sm: 4 }} key={category.eventCategoryId}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.preferredEvents.includes(category.eventCategoryId)}
                        onChange={() => handleEventToggle(category.eventCategoryId)}
                        color="secondary"
                      />
                    }
                    label={category.name}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Alert severity="info" sx={{ mt: 2 }}>
            These settings help us personalize your event recommendations and notification preferences.
          </Alert>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Box>
    </Box>
  );
}
