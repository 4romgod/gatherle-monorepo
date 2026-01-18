'use client';

import React from 'react';
import { Grid, TextField } from '@mui/material';
import { FormErrors } from '@/components/form-errors';
import { UserLocationInput } from '@/data/graphql/types/graphql';

interface LocationFormProps {
  value: UserLocationInput | null | undefined;
  onChange: (location: UserLocationInput) => void;
  disabled?: boolean;
  errors?: Record<string, string[]>;
  name?: string;
}

export default function LocationForm({
  value,
  onChange,
  disabled = false,
  errors = {},
  name = 'location',
}: LocationFormProps) {
  const defaultLocation: UserLocationInput = {
    city: '',
    state: '',
    country: '',
  };
  const currentLocation = value || defaultLocation;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name: fieldName, value: fieldValue } = e.target;
    const actualFieldName = fieldName.replace(`${name}_`, '');
    onChange({
      ...currentLocation,
      [actualFieldName]: fieldValue,
    });
  };

  // Create JSON string for the hidden input
  const locationJson = JSON.stringify(currentLocation);

  return (
    <Grid container spacing={2}>
      {/* Hidden input to store the entire location object as JSON */}
      <input type="hidden" name={name} value={locationJson} />

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          id={`${name}-city`}
          fullWidth
          label="City"
          name={`${name}_city`}
          value={currentLocation.city || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
        />
        <FormErrors error={errors?.city} />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          id={`${name}-state`}
          fullWidth
          label="State/Province"
          name={`${name}_state`}
          value={currentLocation.state || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
        />
        <FormErrors error={errors?.state} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          id={`${name}-country`}
          fullWidth
          label="Country"
          name={`${name}_country`}
          value={currentLocation.country || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
        />
        <FormErrors error={errors?.country} />
      </Grid>
    </Grid>
  );
}
