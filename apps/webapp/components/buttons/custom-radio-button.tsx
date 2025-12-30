import React from 'react';
import { Box, Typography, Radio } from '@mui/material';
import { SxProps, Theme } from '@mui/system';

type RadioButtonWithIconProps = {
  label: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  value: string;
  onChange: (value: string) => void;
  sx?: SxProps<Theme>;
};

const RadioButtonWithIcon: React.FC<RadioButtonWithIconProps> = ({
  label,
  description,
  icon,
  selected,
  value,
  onChange,
  sx,
}) => (
  <Box
    component="label"
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      border: '2px solid',
      borderColor: selected ? 'secondary.main' : 'grey.400',
      borderRadius: 2,
      p: 2,
      cursor: 'pointer',
      height: '100%',
      transition: 'all 0.3s',
      '&:hover': {
        borderColor: 'secondary.main',
      },
      ...sx,
    }}
  >
    <Box display="flex" alignItems="flex-start">
      {icon}
      <Box>
        <Typography variant="h6">{label}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
    </Box>
    <Radio value={value} checked={selected} onChange={() => onChange(value)} color="secondary" sx={{ ml: 2 }} />
  </Box>
);

export default RadioButtonWithIcon;
