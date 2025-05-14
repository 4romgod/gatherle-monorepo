import { Box } from '@mui/material';
import dynamic from 'next/dynamic';

const MessagesPanel = dynamic(() => import('@/components/messages/MessagesPanel'));

export default function MessagesPage() {
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper'
      }}
    >
      <MessagesPanel />
    </Box>
  );
}
