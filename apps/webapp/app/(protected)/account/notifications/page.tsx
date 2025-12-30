import { Box } from '@mui/material';
import dynamicComponent from 'next/dynamic';

const NotificationsPanel = dynamicComponent(() => import('@/components/notifications/NotificationsPanel'));

export default function NotificationsPage() {
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        minHeight: '100vh',
      }}
    >
      <NotificationsPanel />
    </Box>
  );
}
