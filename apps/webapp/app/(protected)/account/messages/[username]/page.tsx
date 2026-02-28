import { Box } from '@mui/material';
import dynamicComponent from 'next/dynamic';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

const ConversationThread = dynamicComponent(() => import('@/components/messages/ConversationThread'));

export const metadata: Metadata = buildPageMetadata({
  title: 'Conversation',
  description: `Chat with a member on ${APP_NAME}.`,
  noIndex: true,
});

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { username } = await params;

  return (
    <Box
      sx={{
        height: '100%',
        backgroundColor: 'background.paper',
      }}
    >
      <ConversationThread username={username} />
    </Box>
  );
}
