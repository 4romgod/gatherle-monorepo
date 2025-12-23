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
