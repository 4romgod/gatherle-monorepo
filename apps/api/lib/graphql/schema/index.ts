import 'reflect-metadata';
import { buildSchemaSync } from 'type-graphql';
import {
  AdminResolver,
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
  ImageResolver,
  FeedResolver,
} from '@/graphql/resolvers';
import { authChecker } from '@/utils/auth';
import { ResolveTime } from '@/utils';

const createSchema = () => {
  const schema = buildSchemaSync({
    resolvers: [
      AdminResolver,
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
      ImageResolver,
      FeedResolver,
    ],
    validate: true,
    emitSchemaFile: false,
    globalMiddlewares: [ResolveTime],
    authChecker,
  });

  return schema;
};

export default createSchema;
