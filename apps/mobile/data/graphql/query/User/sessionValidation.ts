import { graphql } from '../../types';
import type {
  ValidateStoredSessionQuery as GeneratedValidateStoredSessionQuery,
  ValidateStoredSessionQueryVariables as GeneratedValidateStoredSessionQueryVariables,
} from '../../types/graphql';

export type ValidateStoredSessionQuery = GeneratedValidateStoredSessionQuery;
export type ValidateStoredSessionQueryVariables = GeneratedValidateStoredSessionQueryVariables;

export const ValidateStoredSessionDocument = graphql(`
  query ValidateStoredSession($userId: String!) {
    readUserById(userId: $userId) {
      userId
      email
      username
    }
  }
`);
