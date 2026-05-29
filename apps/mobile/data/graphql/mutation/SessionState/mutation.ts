import { graphql } from '../../types';

export const SaveSessionStateDocument = graphql(`
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
`);

export const ClearSessionStateDocument = graphql(`
  mutation ClearSessionState($key: String!) {
    clearSessionState(key: $key) {
      userId
    }
  }
`);

export const ClearAllSessionStatesDocument = graphql(`
  mutation ClearAllSessionStates {
    clearAllSessionStates {
      userId
    }
  }
`);
