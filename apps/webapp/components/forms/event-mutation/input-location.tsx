'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TextField,
  Grid,
  Typography,
  Box,
  FormControl,
} from '@mui/material';
import { LocationInputProps } from '@/lib/constants';
import { Location } from '@/data/graphql/types/graphql';
import LocationTypeRadioButtons from '@/components/buttons/location-type-radio-button';

const defaultAddress = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
};

const LocationInput: React.FC<LocationInputProps> = ({ onChange }) => {
  const [locationType, setLocationType] = useState<string>('venue');

  const [locationDetails, setLocationDetails] = useState<Location>({
    locationType,
    address: (locationType === 'venue') ? { ...defaultAddress } : undefined,
    details: (locationType !== 'venue') ? '' : undefined,
  });

  useEffect(() => {
    onChange(locationDetails);
  }, [locationDetails]);

  const handleLocationTypeChange = useCallback((type: string) => {
    setLocationType(type);
    setLocationDetails({
      locationType: type,
      address: (type === 'venue') ? { ...defaultAddress } : undefined,
      details: (type !== 'venue') ? '' : undefined,
    });
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocationDetails((prev) => ({
      ...prev,
      address: prev.address ? { ...prev.address, [name]: value } : undefined,
    }));
  }, []);

  const addressFields = [
    { label: 'Street', name: 'street' },
    { label: 'City', name: 'city' },
    { label: 'State', name: 'state' },
    { label: 'Zip Code', name: 'zipCode' },
    { label: 'Country', name: 'country' },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Location</Typography>

      <FormControl component="fieldset" sx={{ width: '100%', mb: 4 }}>
        <LocationTypeRadioButtons selectedType={locationType} onChange={handleLocationTypeChange} />
      </FormControl>

      {locationType === 'venue' && (
        <Box>
          <Grid container spacing={2}>
            {addressFields.map(({ label, name }) => (
              <Grid size={{xs: 12, sm: 6}} key={name}>
                <TextField
                  fullWidth
                  label={label}
                  name={name}
                  size="small"
                  onChange={handleInputChange}
                  required
                  sx={{ mt: 1 }}
                  color='secondary'
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default LocationInput;
