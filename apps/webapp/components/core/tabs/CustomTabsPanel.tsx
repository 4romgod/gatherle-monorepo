import { ReactNode } from 'react';
import { Box } from '@mui/material';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
  id: string;
}

export function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, id } = props;

  return (
    <Box role="tabpanel" hidden={value !== index} id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`}>
      {value === index && (
        <Box
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
