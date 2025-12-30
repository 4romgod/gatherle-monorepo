'use client';

import React from 'react';
import { Grid, TextField } from '@mui/material';
import { FormErrors } from '@/components/form-errors';
import { Address } from '@/data/graphql/types/graphql';

interface AddressFormProps {
  value: Address | undefined;
  onChange: (address: Address) => void;
  disabled?: boolean;
  errors?: Record<string, string[]>;
  name?: string; // Name for the form context
}

export default function AddressForm({
  value,
  onChange,
  disabled = false,
  errors = {},
  name = 'address',
}: AddressFormProps) {
  const defaultAddress: Address = {
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
  };
  const currentAddress = value || defaultAddress;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name: fieldName, value: fieldValue } = e.target;

    const actualFieldName = fieldName.replace(`${name}_`, '');
    onChange({
      ...currentAddress,
      [actualFieldName]: fieldValue,
    });
  };

  // Create JSON string for the hidden input
  const addressJson = JSON.stringify(currentAddress);

  return (
    <Grid container spacing={2}>
      {/* Hidden input to store the entire address object as JSON */}
      <input type="hidden" name={name} value={addressJson} />

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="Street Name"
          name={`${name}_street`}
          value={currentAddress.street || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
        />
        <FormErrors error={errors?.street} />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label="City"
          name={`${name}_city`}
          value={currentAddress.city || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
          required
        />
        <FormErrors error={errors?.city} />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label="State/Province"
          name={`${name}_state`}
          value={currentAddress.state || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
          required
        />
        <FormErrors error={errors?.state} />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label="Country"
          name={`${name}_country`}
          value={currentAddress.country || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
          required
        />
        <FormErrors error={errors?.country} />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label="ZIP/Postal Code"
          name={`${name}_zipCode`}
          value={currentAddress.zipCode || ''}
          onChange={handleInputChange}
          disabled={disabled}
          variant="outlined"
          color="secondary"
          required
        />
        <FormErrors error={errors?.zipCode} />
      </Grid>
    </Grid>
  );
}
