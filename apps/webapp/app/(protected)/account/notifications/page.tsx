import { Box } from '@mui/material';
import dynamicComponent from 'next/dynamic';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';

const NotificationsPanel = dynamicComponent(() => import('@/components/notifications/NotificationsPanel'));

export const metadata: Metadata = buildPageMetadata({
  title: 'Notifications',
  description: 'Stay updated with event reminders, invites, and activity alerts.',
  noIndex: true,
});

export default function NotificationsPage() {
  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        minHeight: '100vh',
      }}
    >
      <NotificationsPanel />
    </Box>
  );
}
