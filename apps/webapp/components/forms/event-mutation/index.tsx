'use client'

import React, { FormEvent, useState } from 'react';
import { TextField, Button, Grid, Typography, MenuItem, Select, InputLabel, FormControl, Box, SelectChangeEvent } from '@mui/material';
import { CreateEventInputType, EventPrivacySetting, EventStatus, Location } from '@/data/graphql/types/graphql';
import { EventMutationFormProps } from '@/lib/constants';
import CategoryFilter from '@/components/events/filters/category';
import LocationInput from './input-location';
import EventDateInput from './input-event-date';

export default function EventMutationForm({ categoryList }: EventMutationFormProps) {
  const [eventData, setEventData] = useState<CreateEventInputType>({
    title: '',
    description: '',
    location: {},
    recurrenceRule: '',
    status: EventStatus.Upcoming,
    capacity: 100,
    eventCategoryList: [],
    organizerList: [],
    rSVPList: [],
    tags: {},
    media: {
      featuredImageUrl: '',
      otherMediaData: {},
    },
    additionalDetails: {},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    eventLink: '',
  });

  const handleLocationChange = (newLocation: Location) => {
    setEventData({ ...eventData, location: newLocation });
  };

  const handleEventDateChange = (rrule: string) => {
    setEventData({ ...eventData, recurrenceRule: rrule });
  };

  const handleStatusChange = (event: SelectChangeEvent<EventStatus>) => {
    const selectedStatus = event.target.value as EventStatus;
    setEventData({ ...eventData, status: selectedStatus });
  };

  const handleEventCategoryListChange = (eventCategoryList: string[]) => {
    setEventData({ ...eventData, eventCategoryList });
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Add your form submission logic here
    console.log('eventData', eventData);
  };


  return (
    <Box component="div" sx={{ my: 10 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={5}>

          {/* Event Title and Description */}
          <Grid item xs={12}>
            <Box
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid #ccc',
                borderRadius: 5,
                p: 10,
              }}
            >
              <Typography variant="h4">Event Details</Typography>
              <Box
                sx={{
                  py: 5,
                }}
              >
                <Typography variant="h6">Event Title</Typography>
                <Typography variant='body2'>
                  Choose a clear, informative title that tells people exactly what your event is about.
                </Typography>
                <TextField
                  required
                  fullWidth
                  label="Title"
                  name="title"
                  size='small'
                  color='secondary'
                  value={eventData.title}
                  onChange={handleChange}
                  sx={{ mt: 1 }}
                />
              </Box>
              <Box>
                <Typography variant="h6">Summary</Typography>
                <Typography variant='body2'>
                  Write a short, attention-grabbing description for your event. This will appear at the top of your event page (max 140 characters).
                </Typography>
                <TextField
                  required
                  fullWidth
                  label="Description"
                  name="description"
                  size='small'
                  color='secondary'
                  multiline
                  rows={4}
                  value={eventData.description}
                  onChange={handleChange}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Date and Location */}
          <Grid item xs={12}>
            <Box
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid #ccc',
                borderRadius: 5,
                p: 10,
              }}
            >
              <Typography variant="h4">Date and Location</Typography>
              <Box
                sx={{
                  py: 5,
                }}
              >
                <EventDateInput onChange={handleEventDateChange} />
              </Box>

              <Box>
                <LocationInput
                  onChange={handleLocationChange}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid #ccc',
                borderRadius: 5,
                width: '100%',
                p: 10,
              }}
            >
              <Typography variant="h4">Other stuff</Typography>
              <Box
                sx={{
                  py: 2,
                }}
              >
                <Typography variant="h6">What categories does your event fall under?</Typography>
                <CategoryFilter
                  categoryList={categoryList}
                  onChange={handleEventCategoryListChange}
                />
              </Box>
              <Box
                sx={{
                  py: 2,
                }}
              >
                <Typography variant="h6">Event Link</Typography>
                <Typography variant='body2'>Add a link to your event page or website.</Typography>
                <TextField
                  fullWidth
                  label="Event Link"
                  name="eventLink"
                  size='small'
                  color='secondary'
                  value={eventData.eventLink}
                  onChange={handleChange}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box
                sx={{
                  py: 2,
                }}
              >
                <Typography variant="h6">Event Status</Typography>
                <FormControl required size='small'>
                  <InputLabel color='secondary'>Status</InputLabel>
                  <Select
                    name="status"
                    value={eventData.status}
                    onChange={handleStatusChange}
                    color='secondary'
                  >
                    {Object.values(EventStatus).map((status) => (
                      <MenuItem key={`Event-status.${status}`} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box
                sx={{
                  py: 2,
                }}
              >
                <Typography variant="h6">What&apos;s the capacity for your event?</Typography>
                <Typography variant='body2'>Event capacity is the total number of tickets you&apos;re willing to sell.</Typography>
                <TextField
                  label="Capacity"
                  name="capacity"
                  type="number"
                  size='small'
                  color='secondary'
                  value={eventData.capacity}
                  onChange={handleChange}
                  sx={{ mt: 2 }}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
            >
              Create Event
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
