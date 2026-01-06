'use server';

import { auth } from '@/auth';
import { getClient } from '@/data/graphql';
import { DeleteEventByIdDocument } from '@/data/graphql/types/graphql';
import { logger } from '@/lib/utils/logger';

export async function deleteEventAction(eventId: string) {
  const session = await auth();

  logger.action('deleteEventAction', { eventId, hasToken: !!session?.user.token });

  try {
    logger.debug('Sending delete event mutation');
    await getClient().mutate({
      mutation: DeleteEventByIdDocument,
      variables: { eventId },
      context: {
        headers: {
          token: session?.user.token,
        },
      },
    });

    logger.info('Event deleted successfully', { eventId });
    return {
      message: `Event successfully deleted.`,
    };
  } catch (error) {
    logger.error('Failed to delete event', { error, eventId });
    return {
      apiError: 'Something went wrong.',
    };
  }
}
