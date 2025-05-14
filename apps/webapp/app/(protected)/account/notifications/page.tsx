import { Box } from '@mui/material';
import dynamic from 'next/dynamic';

const NotificationsPanel = dynamic(() => import('@/components/notifications/NotificationsPanel'));

export default function NotificationsPage() {
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        minHeight: '100vh'
      }}
    >
      <NotificationsPanel />
    </Box>
  );
}
