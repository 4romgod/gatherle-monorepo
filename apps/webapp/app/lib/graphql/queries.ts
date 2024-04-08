import { gql } from "@apollo/client";

export const readEvents = gql`query Events {
    readEvents {
      title
      description
      startDate
      endDate
      eventType
      eventCategory
      capacity
      status
      tags
      media
      additionalDetails
      comments
      privacySetting
      eventLink
    }
}`;

export const readUsers = gql`query Users {
    readUsers {
      id
      email
      given_name
      family_name
    }
}`;
