import { Box } from '@mui/material';
import dynamicComponent from 'next/dynamic';

const MessagesPanel = dynamicComponent(() => import('@/components/messages/MessagesPanel'));

export default function MessagesPage() {
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
      }}
    >
      <MessagesPanel />
    </Box>
  );
}
