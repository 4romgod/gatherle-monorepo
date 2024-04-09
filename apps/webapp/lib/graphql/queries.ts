import { gql } from '@apollo/client';

export const readEvents = gql`
  query Events {
    readEvents {
      id
      title
      description
      startDate
      endDate
      eventType
      eventCategory
      capacity
      status
      tags
      additionalDetails
      comments
      privacySetting
      eventLink
      organizers
    }
  }
`;

export const readUsers = gql`
  query Users {
    readUsers {
      id
      email
      given_name
      family_name
    }
  }
`;
