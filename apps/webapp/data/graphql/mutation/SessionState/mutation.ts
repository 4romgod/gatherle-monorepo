import { gql } from '@apollo/client';

export const SaveSessionStateDocument = gql`
  mutation SaveSessionState($input: SessionStateInput!) {
    saveSessionState(input: $input) {
      userId
      preferences {
        sessionState {
          key
          value
          version
          updatedAt
        }
      }
    }
  }
`;

export const ClearSessionStateDocument = gql`
  mutation ClearSessionState($key: String!) {
    clearSessionState(key: $key) {
      userId
    }
  }
`;

export const ClearAllSessionStatesDocument = gql`
  mutation ClearAllSessionStates {
    clearAllSessionStates {
      userId
    }
  }
`;
