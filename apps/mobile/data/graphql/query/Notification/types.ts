import type { GetNotificationsQuery } from '../../types/graphql';

export type MobileNotificationConnection = NonNullable<GetNotificationsQuery['notifications']>;
export type MobileNotification = MobileNotificationConnection['notifications'][number];
