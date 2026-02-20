import { Box } from '@mui/material';
import dynamicComponent from 'next/dynamic';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';

const MessagesEntry = dynamicComponent(() => import('@/components/messages/MessagesEntry'));

export const metadata: Metadata = buildPageMetadata({
  title: 'Messages',
  description: 'Read and manage your private conversations on Gatherle.',
  noIndex: true,
});

export default function MessagesPage() {
  return (
    <Box
      sx={{
        height: '100%',
        backgroundColor: 'background.paper',
      }}
    >
      <MessagesEntry />
    </Box>
  );
}
