/**
 * Script to emit the GraphQL schema to a file.
 * This is used by the webapp's codegen to generate types without
 * needing a running server.
 *
 * Usage: npm run emit-schema -w @ntlango/api
 */
import 'reflect-metadata';
import { buildSchemaSync } from 'type-graphql';
import { printSchema } from 'graphql';
import * as fs from 'fs';
import * as path from 'path';
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

const emitSchema = () => {
  console.log('Building GraphQL schema...');

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
    authChecker,
  });

  const schemaString = printSchema(schema);

  // Output to packages/commons so it can be shared
  const outputPath = path.resolve(
    __dirname,
    '../../../../packages/commons/schema.graphql'
  );

  fs.writeFileSync(outputPath, schemaString, 'utf-8');
  console.log(`✅ Schema written to: ${outputPath}`);

  return schemaString;
};

emitSchema();
