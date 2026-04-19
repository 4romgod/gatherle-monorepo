import 'reflect-metadata';
import { buildSchemaSync } from 'type-graphql';
import {
  AdminResolver,
  AuthResolver,
  EventCategoryResolver,
  EventCategoryGroupResolver,
  EventResolver,
  UserResolver,
  EventParticipantResolver,
  OrganizationResolver,
  OrganizationMembershipResolver,
  VenueResolver,
  FollowResolver,
  ActivityResolver,
  ChatResolver,
  NotificationResolver,
  MediaResolver,
  FeedResolver,
  EventMomentResolver,
} from '@/graphql/resolvers';
import { authChecker } from '@/utils/auth';

const createSchema = () => {
  const schema = buildSchemaSync({
    resolvers: [
      AdminResolver,
      AuthResolver,
      EventCategoryResolver,
      EventCategoryGroupResolver,
      EventResolver,
      UserResolver,
      EventParticipantResolver,
      FollowResolver,
      ActivityResolver,
      ChatResolver,
      OrganizationResolver,
      OrganizationMembershipResolver,
      VenueResolver,
      NotificationResolver,
      MediaResolver,
      FeedResolver,
      EventMomentResolver,
    ],
    validate: true,
    emitSchemaFile: false,
    authChecker,
  });

  return schema;
};

export default createSchema;
