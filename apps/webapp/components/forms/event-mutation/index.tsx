'use client';

import React, { FormEvent, useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  SelectChangeEvent,
  Paper,
  Stack,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Event as EventIcon,
  Description,
  Category,
  Settings,
  Image as ImageIcon,
  People,
  Link as LinkIcon,
  Save,
} from '@mui/icons-material';
import {
  CreateEventInput,
  EventPrivacySetting,
  EventStatus,
  EventVisibility,
  EventLifecycleStatus,
  Location,
} from '@/data/graphql/types/graphql';
import { EventMutationFormProps } from '@/lib/constants';
import CategoryFilter from '@/components/events/filters/category';
import LocationInput from './input-location';
import EventDateInput from './input-event-date';

export default function EventMutationForm({ categoryList }: EventMutationFormProps) {
  const [eventData, setEventData] = useState<CreateEventInput>({
    title: '',
    summary: '',
    description: '',
    location: {},
    recurrenceRule: '',
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Draft,
    visibility: EventVisibility.Public,
    capacity: 100,
    rsvpLimit: undefined,
    waitlistEnabled: false,
    allowGuestPlusOnes: false,
    remindersEnabled: true,
    showAttendees: true,
    eventCategories: [],
    organizers: [],
    tags: {},
    media: {},
    mediaAssets: [],
    additionalDetails: {},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    eventLink: '',
    heroImage: '',
    orgId: undefined,
    venueId: undefined,
    locationSnapshot: undefined,
    primarySchedule: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLocationChange = (newLocation: Location) => {
    setEventData({ ...eventData, location: newLocation });
  };

  const handleEventDateChange = (rrule: string) => {
    setEventData({ ...eventData, recurrenceRule: rrule });
  };

  const handleStatusChange = (event: SelectChangeEvent<EventStatus>) => {
    setEventData({ ...eventData, status: event.target.value as EventStatus });
  };

  const handleVisibilityChange = (event: SelectChangeEvent<EventVisibility>) => {
    setEventData({ ...eventData, visibility: event.target.value as EventVisibility });
  };

  const handlePrivacyChange = (event: SelectChangeEvent<EventPrivacySetting>) => {
    setEventData({ ...eventData, privacySetting: event.target.value as EventPrivacySetting });
  };

  const handleEventCategoryListChange = (eventCategories: string[]) => {
    setEventData({ ...eventData, eventCategories });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData({ ...eventData, [name]: value ? parseInt(value, 10) : undefined });
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setEventData({ ...eventData, [name]: checked });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!eventData.title?.trim()) newErrors.title = 'Title is required';
    if (!eventData.summary?.trim()) newErrors.summary = 'Summary is required';
    if (!eventData.description?.trim()) newErrors.description = 'Description is required';
    if (!eventData.recurrenceRule) newErrors.recurrenceRule = 'Event date is required';
    if (eventData.eventCategories.length === 0) newErrors.categories = 'Select at least one category';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Add your form submission logic here
    console.log('eventData', eventData);
  };

  return (
    <Box component="div" sx={{ py: 6, px: { xs: 0, sm: 2, md: 4 }, mx: 'auto' }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={6}>
          {/* Header */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h3" gutterBottom fontWeight={700}>
              Create Your Event
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Fill in the details below to create an amazing event that people will love to attend
            </Typography>
          </Box>

          {Object.keys(errors).length > 0 && (
            <Alert severity="error">
              Please fix the errors below before submitting
            </Alert>
          )}

          {/* Basic Information */}
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack spacing={4}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <EventIcon color="primary" />
                <Typography variant="h5" fontWeight={600}>
                  Basic Information
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600} sx={{ mb: 1 }}>
                  Event Title *
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Choose a clear, informative title that tells people exactly what your event is about
                </Typography>
                <TextField
                  required
                  fullWidth
                  placeholder="e.g., Summer Music Festival 2026"
                  name="title"
                  size="medium"
                  color="secondary"
                  value={eventData.title}
                  onChange={handleChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Summary *
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Write a short, attention-grabbing description (shown in event listings)
                </Typography>
                <TextField
                  required
                  fullWidth
                  placeholder="A brief overview of your event..."
                  name="summary"
                  size="medium"
                  color="secondary"
                  multiline
                  rows={3}
                  value={eventData.summary}
                  onChange={handleChange}
                  error={!!errors.summary}
                  helperText={errors.summary}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Full Description *
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Provide detailed information about your event, what to expect, and what guests need to know
                </Typography>
                <TextField
                  required
                  fullWidth
                  placeholder="Tell people all about your event..."
                  name="description"
                  size="medium"
                  color="secondary"
                  multiline
                  rows={6}
                  value={eventData.description}
                  onChange={handleChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Stack>
          </Paper>

          {/* Date and Location */}
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack spacing={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Description color="primary" />
                <Typography variant="h5" fontWeight={600}>
                  Date & Location
                </Typography>
              </Stack>
              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  When is your event? *
                </Typography>
                <EventDateInput onChange={handleEventDateChange} />
                {errors.recurrenceRule && (
                  <Typography variant="caption" color="error">
                    {errors.recurrenceRule}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Where is it happening? *
                </Typography>
                <LocationInput onChange={handleLocationChange} />
              </Box>
            </Stack>
          </Paper>

          {/* Categories & Media */}
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack spacing={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Category color="primary" />
                <Typography variant="h5" fontWeight={600}>
                  Categories & Media
                </Typography>
              </Stack>
              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Event Categories *
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Help people find your event by selecting relevant categories
                </Typography>
                <CategoryFilter categoryList={categoryList} onChange={handleEventCategoryListChange} />
                {errors.categories && (
                  <Typography variant="caption" color="error">
                    {errors.categories}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Hero Image URL
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Add a stunning cover image for your event
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://example.com/image.jpg"
                  name="heroImage"
                  size="medium"
                  color="secondary"
                  value={eventData.heroImage}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ImageIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Event Link
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Add a link to your event website or ticketing page
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://your-event-website.com"
                  name="eventLink"
                  size="medium"
                  color="secondary"
                  value={eventData.eventLink}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Stack>
          </Paper>

          {/* Capacity & Attendees */}
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack spacing={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <People color="primary" />
                <Typography variant="h5" fontWeight={600}>
                  Capacity & Attendee Settings
                </Typography>
              </Stack>
              <Divider />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Event Capacity
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Maximum number of attendees
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="100"
                    name="capacity"
                    type="number"
                    size="medium"
                    color="secondary"
                    value={eventData.capacity || ''}
                    onChange={handleNumberChange}
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    RSVP Limit
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Optional RSVP limit (leave empty for no limit)
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Optional"
                    name="rsvpLimit"
                    type="number"
                    size="medium"
                    color="secondary"
                    value={eventData.rsvpLimit || ''}
                    onChange={handleNumberChange}
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>

              <Stack spacing={2.5}>
                <FormControlLabel
                  control={
                    <Switch
                      name="waitlistEnabled"
                      checked={eventData.waitlistEnabled || false}
                      onChange={handleSwitchChange}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        Enable Waitlist
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allow people to join a waitlist when event is full
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      name="allowGuestPlusOnes"
                      checked={eventData.allowGuestPlusOnes || false}
                      onChange={handleSwitchChange}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        Allow Plus Ones
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Let attendees bring a guest
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      name="showAttendees"
                      checked={eventData.showAttendees !== false}
                      onChange={handleSwitchChange}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        Show Attendee List
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Display who's attending on the event page
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      name="remindersEnabled"
                      checked={eventData.remindersEnabled !== false}
                      onChange={handleSwitchChange}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        Send Reminders
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Automatically remind attendees before the event
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </Stack>
          </Paper>

          {/* Settings */}
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack spacing={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Settings color="primary" />
                <Typography variant="h5" fontWeight={600}>
                  Event Settings
                </Typography>
              </Stack>
              <Divider />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="medium">
                    <InputLabel color="secondary">Status</InputLabel>
                    <Select
                      name="status"
                      value={eventData.status}
                      onChange={handleStatusChange}
                      color="secondary"
                      label="Status"
                      sx={{ borderRadius: 2 }}
                    >
                      {Object.values(EventStatus).map(status => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="medium">
                    <InputLabel color="secondary">Visibility</InputLabel>
                    <Select
                      name="visibility"
                      value={eventData.visibility || ''}
                      onChange={handleVisibilityChange}
                      color="secondary"
                      label="Visibility"
                      sx={{ borderRadius: 2 }}
                    >
                      {Object.values(EventVisibility).map(visibility => (
                        <MenuItem key={visibility} value={visibility}>
                          {visibility}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="medium">
                    <InputLabel color="secondary">Privacy</InputLabel>
                    <Select
                      name="privacySetting"
                      value={eventData.privacySetting || ''}
                      onChange={handlePrivacyChange}
                      color="secondary"
                      label="Privacy"
                      sx={{ borderRadius: 2 }}
                    >
                      {Object.values(EventPrivacySetting).map(privacy => (
                        <MenuItem key={privacy} value={privacy}>
                          {privacy}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Stack>
          </Paper>

          {/* Submit */}
          <Box display="flex" justifyContent="flex-end" sx={{ mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
              startIcon={<Save />}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Create Event
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
