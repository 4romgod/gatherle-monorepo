'use client';

import React, { FormEvent, useMemo, useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Box,
  SelectChangeEvent,
  Card,
  Stack,
  FormControlLabel,
  Switch,
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
import { useQuery } from '@apollo/client';
import {
  CreateEventInput,
  EventPrivacySetting,
  EventStatus,
  EventVisibility,
  EventLifecycleStatus,
  Location,
  OrganizationRole,
} from '@/data/graphql/types/graphql';
import { EventMutationFormProps, BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import CategoryFilter from '@/components/events/filters/category';
import EventLocationInput from './EventLocationInput';
import EventDateInput from './EventDateInput';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { usePersistentState } from '@/hooks';
import { useSession } from 'next-auth/react';
import { GetMyOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { getAuthHeader } from '@/lib/utils/auth';

const EVENT_ORGANIZATION_ROLES = new Set([OrganizationRole.Owner, OrganizationRole.Admin, OrganizationRole.Host]);

export default function EventMutationForm({ categoryList, event }: EventMutationFormProps) {
  const isEditMode = !!event;
  const { data: sessionData, status: sessionStatus } = useSession();
  const { data: myOrganizationsData, loading: myOrganizationsLoading } = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: sessionStatus !== 'authenticated',
    context: {
      headers: getAuthHeader(sessionData?.user?.token),
    },
  });

  const defaultEventData = useMemo<CreateEventInput>(() => {
    return {
      title: event?.title ?? '',
      summary: event?.summary ?? '',
      description: event?.description ?? '',
      location: event?.location ?? ({ locationType: 'venue' } as Location),
      recurrenceRule: event?.recurrenceRule ?? '',
      status: event?.status ?? EventStatus.Upcoming,
      lifecycleStatus: event?.lifecycleStatus ?? EventLifecycleStatus.Draft,
      visibility: event?.visibility ?? EventVisibility.Public,
      capacity: event?.capacity ?? 100,
      rsvpLimit: undefined,
      waitlistEnabled: false,
      allowGuestPlusOnes: false,
      remindersEnabled: true,
      showAttendees: true,
      eventCategories: event?.eventCategories?.map((c) => c.eventCategoryId) ?? [],
      organizers: event?.organizers?.map((o) => o.user.userId) ?? [],
      tags: event?.tags ?? {},
      media: event?.media ?? {},
      additionalDetails: {},
      comments: {},
      privacySetting: event?.privacySetting ?? EventPrivacySetting.Public,
      eventLink: event?.eventLink ?? '',
      heroImage: event?.heroImage ?? '',
      orgId: event?.orgId ?? undefined,
      venueId: event?.venueId,
      locationSnapshot: undefined,
      primarySchedule: undefined,
    };
  }, [event]);

  const persistenceId = event?.eventId ?? event?.slug ?? 'new';
  const {
    value: eventData,
    setValue: setEventData,
    clearStorage,
    isHydrated,
  } = usePersistentState<CreateEventInput>(persistenceId, defaultEventData, {
    namespace: 'event-mutation',
    userId: sessionData?.user?.userId,
    ttl: 1000 * 60 * 60 * 24 * 7,
    disabled: sessionStatus === 'unauthenticated',
    syncToBackend: false,
  });

  // Use default data during SSR and initial render to prevent hydration mismatch
  const displayEventData = isHydrated ? eventData : defaultEventData;

  const eligibleOrganizations = (myOrganizationsData?.readMyOrganizations ?? []).filter((membership) =>
    EVENT_ORGANIZATION_ROLES.has(membership.role),
  );

  const organizationHelperText = myOrganizationsLoading
    ? 'Loading your organizations...'
    : eligibleOrganizations.length > 0
      ? 'Owner, Admin, or Host roles can attach this organization to the event.'
      : 'No organizations with the required role were found.';

  const handleOrganizationChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setEventData((prev) => ({
      ...prev,
      orgId: value || undefined,
    }));
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDiscardDialogOpen, setDiscardDialogOpen] = useState(false);

  const handleLocationChange = (newLocation: Location) => {
    setEventData((prev) => ({ ...prev, location: newLocation }));
  };

  const handleVenueChange = (venueId?: string | null) => {
    setEventData((prev) => ({ ...prev, venueId: venueId ?? undefined }));
  };

  const handleEventDateChange = (rrule: string) => {
    setEventData((prev) => ({ ...prev, recurrenceRule: rrule }));
  };

  const handleStatusChange = (event: SelectChangeEvent<EventStatus>) => {
    setEventData((prev) => ({ ...prev, status: event.target.value as EventStatus }));
  };

  const handleVisibilityChange = (event: SelectChangeEvent<EventVisibility>) => {
    setEventData((prev) => ({ ...prev, visibility: event.target.value as EventVisibility }));
  };

  const handlePrivacyChange = (event: SelectChangeEvent<EventPrivacySetting>) => {
    setEventData((prev) => ({ ...prev, privacySetting: event.target.value as EventPrivacySetting }));
  };

  const handleEventCategoryListChange = (eventCategories: string[]) => {
    setEventData((prev) => ({ ...prev, eventCategories }));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData((prev) => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setEventData((prev) => ({ ...prev, [name]: checked }));
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

    // TODO: Add your form submission logic here
    console.log('eventData', eventData);
  };

  const handleDiscardDraft = () => {
    setDiscardDialogOpen(true);
  };

  const confirmDiscardDraft = () => {
    clearStorage();
    setErrors({});
    setDiscardDialogOpen(false);
  };

  const cancelDiscard = () => {
    setDiscardDialogOpen(false);
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
              }}
            >
              {isEditMode ? 'UPDATE EVENT' : 'NEW EVENT'}
            </Typography>
            <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              {isEditMode ? 'Update Event Details' : 'Create Your Event'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
              {isEditMode
                ? 'Make changes to your event information below'
                : 'Fill in the details below to create an amazing event that people will love to attend'}
            </Typography>
          </Box>

          <FormControl fullWidth disabled={myOrganizationsLoading}>
            <InputLabel id="organization-select-label">Organization</InputLabel>
            <Select
              labelId="organization-select-label"
              label="Organization"
              value={displayEventData.orgId ?? ''}
              onChange={handleOrganizationChange}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">
                <em>No organization (personal event)</em>
              </MenuItem>
              {eligibleOrganizations.map(({ organization, role }) => (
                <MenuItem key={organization.orgId} value={organization.orgId}>
                  {organization.name} ({role})
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{organizationHelperText}</FormHelperText>
          </FormControl>

          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Please fix the errors below before submitting
            </Alert>
          )}

          <Card elevation={0} sx={{ borderRadius: 3, p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    display: 'flex',
                  }}
                >
                  <EventIcon />
                </Box>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Basic Information
                </Typography>
              </Stack>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Event Title *
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Choose a clear, informative title that tells people exactly what your event is about
                </Typography>
                <TextField
                  required
                  fullWidth
                  placeholder="e.g., Summer Music Festival 2026"
                  name="title"
                  size="medium"
                  color="secondary"
                  value={displayEventData.title}
                  onChange={handleChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Summary *
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
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
                  value={displayEventData.summary}
                  onChange={handleChange}
                  error={!!errors.summary}
                  helperText={errors.summary}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Full Description *
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
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
                  value={displayEventData.description}
                  onChange={handleChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Stack>
          </Card>

          {/* Date and Location */}
          <Card elevation={0} sx={{ borderRadius: 3, p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    display: 'flex',
                  }}
                >
                  <Description />
                </Box>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Date & Location
                </Typography>
              </Stack>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                  When is your event? *
                </Typography>
                <EventDateInput onChange={handleEventDateChange} />
                {errors.recurrenceRule && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.recurrenceRule}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                  Where is it happening? *
                </Typography>
                <EventLocationInput
                  onChange={handleLocationChange}
                  value={displayEventData.location}
                  venueId={displayEventData.venueId}
                  onVenueChange={handleVenueChange}
                />
              </Box>
            </Stack>
          </Card>

          {/* Categories & Media */}
          <Card elevation={0} sx={{ borderRadius: 3, p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    display: 'flex',
                  }}
                >
                  <Category />
                </Box>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Categories & Media
                </Typography>
              </Stack>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Event Categories *
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Help people find your event by selecting relevant categories
                </Typography>
                <CategoryFilter
                  categoryList={categoryList}
                  onChange={handleEventCategoryListChange}
                  value={displayEventData.eventCategories}
                />
                {errors.categories && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.categories}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Hero Image URL
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Add a stunning cover image for your event
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://example.com/image.jpg"
                  name="heroImage"
                  size="medium"
                  color="secondary"
                  value={displayEventData.heroImage}
                  onChange={handleChange}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <ImageIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Event Link
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Add a link to your event website or registration page
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://your-event-website.com"
                  name="eventLink"
                  size="medium"
                  color="secondary"
                  value={displayEventData.eventLink}
                  onChange={handleChange}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LinkIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Stack>
          </Card>

          {/* Capacity & Attendees */}
          <Card elevation={0} sx={{ borderRadius: 3, p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    display: 'flex',
                  }}
                >
                  <People />
                </Box>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Capacity & Attendee Settings
                </Typography>
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Event Capacity
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Maximum number of attendees
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="100"
                    name="capacity"
                    type="number"
                    size="medium"
                    color="secondary"
                    value={displayEventData.capacity || ''}
                    onChange={handleNumberChange}
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                    RSVP Limit
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Optional RSVP limit (leave empty for no limit)
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Optional"
                    name="rsvpLimit"
                    type="number"
                    size="medium"
                    color="secondary"
                    value={displayEventData.rsvpLimit || ''}
                    onChange={handleNumberChange}
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      name="waitlistEnabled"
                      checked={displayEventData.waitlistEnabled || false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
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
                      checked={displayEventData.allowGuestPlusOnes || false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
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
                      checked={displayEventData.showAttendees !== false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
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
                      checked={displayEventData.remindersEnabled !== false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
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
          </Card>

          {/* Settings */}
          <Card elevation={0} sx={{ borderRadius: 3, p: 3 }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    display: 'flex',
                  }}
                >
                  <Settings />
                </Box>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Event Settings
                </Typography>
              </Stack>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="medium">
                    <InputLabel color="secondary">Status</InputLabel>
                    <Select
                      name="status"
                      value={displayEventData.status}
                      onChange={handleStatusChange}
                      color="secondary"
                      label="Status"
                      sx={{ borderRadius: 2 }}
                    >
                      {Object.values(EventStatus).map((status) => (
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
                      value={displayEventData.visibility || ''}
                      onChange={handleVisibilityChange}
                      color="secondary"
                      label="Visibility"
                      sx={{ borderRadius: 2 }}
                    >
                      {Object.values(EventVisibility).map((visibility) => (
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
                      value={displayEventData.privacySetting || ''}
                      onChange={handlePrivacyChange}
                      color="secondary"
                      label="Privacy"
                      sx={{ borderRadius: 2 }}
                    >
                      {Object.values(EventPrivacySetting).map((privacy) => (
                        <MenuItem key={privacy} value={privacy}>
                          {privacy}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Stack>
          </Card>

          {/* Submit */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={handleDiscardDraft}
              sx={{ ...BUTTON_STYLES, px: 4 }}
            >
              Discard draft
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Save />}
              sx={{ ...BUTTON_STYLES, px: 4 }}
            >
              {isEditMode ? 'Save Changes' : 'Create Event'}
            </Button>
          </Stack>
        </Stack>
      </Box>
      <ConfirmDialog
        open={isDiscardDialogOpen}
        title="Discard draft?"
        description="Discarding will remove the saved draft from this browser. You can always start again from scratch."
        confirmLabel="Discard"
        onConfirm={confirmDiscardDraft}
        onCancel={cancelDiscard}
      />
    </>
  );
}
