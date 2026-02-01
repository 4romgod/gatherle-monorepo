import { gql } from '@apollo/client';

export const ReadSessionStateDocument = gql`
  query ReadSessionState($key: String!) {
    readSessionState(key: $key) {
      key
      value
      version
      updatedAt
    }
  }
`;

export const ReadAllSessionStatesDocument = gql`
  query ReadAllSessionStates {
    readAllSessionStates {
      key
      value
      version
      updatedAt
    }
  }
`;
