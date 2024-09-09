'use client'

import React, { FormEvent, useState } from 'react';
import { TextField, Button, Grid, Typography, MenuItem, Select, InputLabel, FormControl, Box, SelectChangeEvent } from '@mui/material';
import { CreateEventInputType, EventPrivacySetting, EventStatus, Location } from '@/data/graphql/types/graphql';
import { EventMutationFormProps } from '@/lib/constants';
import CategoryFilter from '@/components/events/filters/category';
import LocationInput from './input-location';
import RecurrenceInput from './input-recurrence';

export default function EventMutationForm({ categoryList }: EventMutationFormProps) {
  const [location, setLocation] = useState<Location | null>(null);
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
    setLocation(newLocation);
  };

  const handleStatusChange = (event: SelectChangeEvent<EventStatus>) => {
    const selectedStatus = event.target.value as EventStatus;
    setEventData({ ...eventData, status: selectedStatus });
  };

  const handleRecurrenceRuleChange = (rrule: string) => {
    setEventData({ ...eventData, recurrenceRule: rrule });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Add your form submission logic here
    console.log('eventData', {
      ...eventData,
      location,
    });
  };


  return (
    <Box component="div" sx={{ my: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create Event
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <Typography variant="h6">What’s the name of your event?</Typography>
            <Typography variant='body2'>This will be your event’s title. Your title will be used to help create your event’s summary, description, category, and tags – so be specific!</Typography>
            <TextField
              required
              fullWidth
              label="Title"
              name="title"
              size='small'
              value={eventData.title}
              onChange={handleChange}
              sx={{ mt: 1 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">Give a good description of your event</Typography>
            <TextField
              required
              fullWidth
              label="Description"
              name="description"
              size='small'
              multiline
              rows={4}
              value={eventData.description}
              onChange={handleChange}
              sx={{ mt: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">What categories does your event fall under?</Typography>
            <CategoryFilter
              categoryList={categoryList}
            />
          </Grid>
          <Grid item xs={12}>
            <RecurrenceInput onChange={handleRecurrenceRuleChange} />
          </Grid>
          <Grid item xs={12}>
            <LocationInput
              onChange={handleLocationChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">Event Status</Typography>
            <FormControl required size='small'>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={eventData.status}
                onChange={handleStatusChange}
              >
                {Object.values(EventStatus).map((status) => (
                  <MenuItem key={`Event-status.${status}`} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">What&apos;s the capacity for your event?</Typography>
            <Typography variant='body2'>Event capacity is the total number of tickets you&apos;re willing to sell.</Typography>
            <TextField
              label="Capacity"
              name="capacity"
              type="number"
              size='small'
              value={eventData.capacity}
              onChange={handleChange}
              sx={{ mt: 2 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">How much do you want to charge for tickets?</Typography>
            <Typography variant='body2'>Our tool can only generate one General Admission ticket for now. You can edit and add more ticket types later.</Typography>
            <TextField
              label="Price"
              name="price"
              type="number"
              size='small'
              value={0}
              onChange={handleChange}
              sx={{ mt: 2 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
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
