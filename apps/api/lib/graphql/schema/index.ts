import 'reflect-metadata';
import { buildSchemaSync } from 'type-graphql';
import {
  AdminResolver,
  AuthResolver,
  EventCategoryResolver,
  EventCategoryGroupResolver,
  EventOccurrenceResolver,
  EventOccurrenceParticipantResolver,
  EventScheduleResolver,
  EventSeriesResolver,
  UserResolver,
  EventSeriesParticipantResolver,
  OrganizationResolver,
  OrganizationMembershipResolver,
  VenueResolver,
  FollowResolver,
  ActivityResolver,
  ChatResolver,
  NotificationResolver,
  PushSubscriptionResolver,
  MediaResolver,
  MobileDeviceAccessResolver,
  FeedResolver,
  EventMomentResolver,
  SupportRequestResolver,
} from '@/graphql/resolvers';
import { authChecker } from '@/utils/auth';

const createSchema = () => {
  const schema = buildSchemaSync({
    resolvers: [
      AdminResolver,
      AuthResolver,
      EventCategoryResolver,
      EventCategoryGroupResolver,
      EventOccurrenceResolver,
      EventOccurrenceParticipantResolver,
      EventScheduleResolver,
      EventSeriesResolver,
      UserResolver,
      EventSeriesParticipantResolver,
      FollowResolver,
      ActivityResolver,
      ChatResolver,
      OrganizationResolver,
      OrganizationMembershipResolver,
      VenueResolver,
      NotificationResolver,
      MobileDeviceAccessResolver,
      PushSubscriptionResolver,
      MediaResolver,
      FeedResolver,
      EventMomentResolver,
      SupportRequestResolver,
    ],
    validate: true,
    emitSchemaFile: false,
    authChecker,
  });

  return schema;
};

export default createSchema;
