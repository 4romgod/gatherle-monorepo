import React from 'react';
import { Grid } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RadioButtonWithIcon from '@/components/buttons/custom-radio-button';
import { EventRadioButtonsProps } from '@/lib/constants';

const EventRadioButtons: React.FC<EventRadioButtonsProps> = ({ selectedType, onChange }) => (
  <Grid container spacing={2}>
    {[
      {
        value: 'single',
        label: 'Single Event',
        description: 'Happens only once at a specific date and time.',
      },
      {
        value: 'recurring',
        label: 'Recurring Event',
        description: 'Repeats over a period on a schedule.',
      },
    ].map(({ value, label, description }) => (
      <Grid size={{xs: 12, sm: 6}} key={value}>
        <RadioButtonWithIcon
          label={label}
          description={description}
          icon={<CalendarTodayIcon sx={{ color: 'secondary.dark', mr: 2, mt: 0.5 }} />}
          selected={selectedType === value}
          value={value}
          onChange={onChange}
        />
      </Grid>
    ))}
  </Grid>
);

export default EventRadioButtons;
