import React from 'react';
import { Grid } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RadioButtonWithIcon from '@/components/buttons/custom-radio-button';
import { LocationTypeRadioButtonsProps } from '@/lib/constants';

const LocationTypeRadioButtons: React.FC<LocationTypeRadioButtonsProps> = ({ selectedType, onChange }) => (
  <Grid container spacing={2}>
    {[
      {
        value: 'venue',
        label: 'Venue',
        description: 'Specific Location',
      },
      {
        value: 'online',
        label: 'Online',
        description: 'Virtual Location',
      },
      {
        value: 'tba',
        label: 'TBA',
        description: 'To be Announced',
      }
    ].map(({ value, label, description }) => (
      <Grid size={{ xs: 12, sm: 4 }} key={value}>
        <RadioButtonWithIcon
          label={label}
          description={description}
          icon={<CalendarTodayIcon sx={{ color: 'text.secondary', mr: 2, mt: 0.5 }} />}
          selected={selectedType === value}
          value={value}
          onChange={onChange}
        />
      </Grid>
    ))}
  </Grid>
);

export default LocationTypeRadioButtons;
