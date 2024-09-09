'use client'

import React, { useEffect, useState } from 'react';
import { TextField, Button, Grid, Typography, Box, ButtonGroup } from '@mui/material';
import { PinDrop, CalendarMonthOutlined, VideoCallOutlined } from '@mui/icons-material';
import { LocationInputProps } from '@/lib/constants';
import { Location } from '@/data/graphql/types/graphql';

// TODO persist thw location in local storage
export default function LocationInput({ onChange }: LocationInputProps) {
  const [locationType, setLocationType] = useState<string>('venue');

  const initializeLocationDetails = (): Location => ({
    locationType,
    address: locationType === 'venue' ? {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    } : undefined,
    details: locationType !== 'venue' ? '' : undefined,
  });

  const [locationDetails, setLocationDetails] = useState<Location>(initializeLocationDetails);

  useEffect(() => {
    onChange(locationDetails);
  }, [locationDetails, onChange]);

  const handleLocationTypeChange = (type: string) => {
    setLocationType(type);

    setLocationDetails({
      locationType: type,
      address: type === 'venue' ? {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      } : undefined,
      details: type !== 'venue' ? '' : undefined,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocationDetails((prevDetails) => ({
      ...prevDetails,
      address: prevDetails.address ? {
        ...prevDetails.address,
        [name]: value,
      } : prevDetails.address,
    }));
  };

  return (
    <Box>
      <Typography variant="h6">Where is it located?</Typography>
      <ButtonGroup fullWidth sx={{ mt: 1 }}>
        <Button
          variant={locationType === 'venue' ? 'contained' : 'outlined'}
          onClick={() => handleLocationTypeChange('venue')}
          startIcon={<PinDrop />}
        >
          Venue
        </Button>
        <Button
          variant={locationType === 'online' ? 'contained' : 'outlined'}
          onClick={() => handleLocationTypeChange('online')}
          startIcon={<VideoCallOutlined />}
        >
          Online
        </Button>
        <Button
          variant={locationType === 'tba' ? 'contained' : 'outlined'}
          onClick={() => handleLocationTypeChange('tba')}
          startIcon={<CalendarMonthOutlined />}
        >
          To Be Announced
        </Button>
      </ButtonGroup>
      {locationType === 'venue' && (
        <Box sx={{ mt: 2 }}>
          {/* <TextField
            fullWidth
            label="Location"
            name="location"
            size='small'
            onChange={handleInputChange}
            required
            sx={{ mt: 1 }}
          /> */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                size='small'
                onChange={handleInputChange}
                required
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                size='small'
                onChange={handleInputChange}
                required
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State"
                name="state"
                size='small'
                onChange={handleInputChange}
                required
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Zip Code"
                name="zipCode"
                size='small'
                onChange={handleInputChange}
                required
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}