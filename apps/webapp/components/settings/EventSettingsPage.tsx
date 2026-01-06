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
  Stack,
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
    <Box>
      <Box sx={{ mb: { xs: 3, sm: 5 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'text.primary', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Event Preferences
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Customize how you discover and receive notifications about events
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Notification Preferences */}
        <Grid size={{ xs: 12 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Notification Preferences
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={() => handleToggleChange('emailNotifications')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Email Notifications
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Receive event updates and recommendations via email
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={() => handleToggleChange('pushNotifications')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Push Notifications
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Get instant notifications on your device
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.eventRecommendations}
                      onChange={() => handleToggleChange('eventRecommendations')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Event Recommendations
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Receive personalized event suggestions based on your interests
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          </Box>
        </Grid>

        {/* Event Discovery */}
        <Grid size={{ xs: 12 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Event Discovery
            </Typography>

            <Box>
              <Typography variant="body1" fontWeight={600} gutterBottom>
                Maximum Distance: <Typography component="span" color="secondary.main">{settings.maxDistanceForEvents} miles</Typography>
              </Typography>
              <Slider
                value={settings.maxDistanceForEvents}
                onChange={handleSliderChange}
                valueLabelDisplay="auto"
                step={5}
                marks={[
                  { value: 5, label: '5 mi' },
                  { value: 25, label: '25 mi' },
                  { value: 50, label: '50 mi' },
                  { value: 75, label: '75 mi' },
                  { value: 100, label: '100 mi' },
                ]}
                min={5}
                max={100}
                color="secondary"
                sx={{ mt: 2, mx: 1 }}
              />
            </Box>
          </Box>
        </Grid>

        {/* Notification Frequency */}
        <Grid size={{ xs: 12 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Notification Frequency
            </Typography>

            <FormControl fullWidth variant="outlined">
              <InputLabel color="secondary">Frequency</InputLabel>
              <Select
                value={settings.eventFrequency}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    eventFrequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                  }))
                }
                label="Frequency"
                color="secondary"
              >
                <MenuItem value="daily">Daily - Get notified every day</MenuItem>
                <MenuItem value="weekly">Weekly - Receive a weekly digest</MenuItem>
                <MenuItem value="monthly">Monthly - Get a monthly summary</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Grid>

        {/* Preferred Event Types */}
        <Grid size={{ xs: 12 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Preferred Event Types
            </Typography>

            {!hasInterests ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  You haven't selected any interests yet.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Visit the Interests page to customize your event preferences.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {user.interests?.map(category => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.eventCategoryId}>
                    <Box sx={{ py: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.preferredEvents.includes(category.eventCategoryId)}
                            onChange={() => handleEventToggle(category.eventCategoryId)}
                            color="secondary"
                          />
                        }
                        label={<Typography variant="body2" fontWeight={500}>{category.name}</Typography>}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={handleSave}
          size="large"
          sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: { xs: '100%', sm: 'auto' } }}
        >
          Save Changes
        </Button>
      </Stack>
    </Box>
  );
}
