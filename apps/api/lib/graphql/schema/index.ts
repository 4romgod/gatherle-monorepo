import 'reflect-metadata';
import { buildSchemaSync } from 'type-graphql';
import {
  EventCategoryResolver,
  EventCategoryGroupResolver,
  EventResolver,
  UserResolver,
  EventParticipantResolver,
  OrganizationResolver,
  OrganizationMembershipResolver,
  VenueResolver,
  FollowResolver,
  IntentResolver,
  ActivityResolver,
} from '@/graphql/resolvers';
import { authChecker } from '@/utils/auth';
import { ResolveTime } from '@/utils';

const createSchema = () => {
  const schema = buildSchemaSync({
    resolvers: [
      EventCategoryResolver,
      EventCategoryGroupResolver,
      EventResolver,
      UserResolver,
      EventParticipantResolver,
      FollowResolver,
      IntentResolver,
      ActivityResolver,
      OrganizationResolver,
      OrganizationMembershipResolver,
      VenueResolver,
    ],
    validate: true,
    emitSchemaFile: false,
    globalMiddlewares: [ResolveTime],
    authChecker,
  });

  return schema;
};

export default createSchema;
