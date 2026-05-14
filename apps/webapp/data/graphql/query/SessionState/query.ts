import { gql } from '@apollo/client';

export const GetSessionStateDocument = gql`
  query GetSessionState($key: String!) {
    readSessionState(key: $key) {
      key
      value
      version
      updatedAt
    }
  }
`;

export const GetSessionStatesDocument = gql`
  query GetSessionStates {
    readAllSessionStates {
      key
      value
      version
      updatedAt
    }
  }
`;
