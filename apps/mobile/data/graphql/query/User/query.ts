import { graphql } from '../../types';

export const GetUserByIdDocument = graphql(`
  query GetUserById($userId: String!) {
    readUserById(userId: $userId) {
      userId
      email
      username
      bio
      given_name
      family_name
      profile_picture
      userRole
      followersCount
      defaultVisibility
      location {
        city
        state
        country
      }
      interests {
        eventCategoryId
        slug
        name
        iconName
        description
        color
      }
    }
  }
`);

export const GetUserByUsernameDocument = graphql(`
  query GetUserByUsername($username: String!) {
    readUserByUsername(username: $username) {
      userId
      email
      username
      bio
      given_name
      family_name
      profile_picture
      userRole
      followersCount
      defaultVisibility
      location {
        city
        state
        country
      }
      interests {
        eventCategoryId
        slug
        name
        iconName
        description
        color
      }
    }
  }
`);

export const GetAccountProfileDocument = graphql(`
  query GetAccountProfile($username: String!) {
    readUserByUsername(username: $username) {
      userId
      email
      username
      bio
      birthdate
      given_name
      family_name
      gender
      phone_number
      profile_picture
      userRole
      followersCount
      defaultVisibility
      followPolicy
      followersListVisibility
      followingListVisibility
      shareRSVPByDefault
      shareCheckinsByDefault
      preferences {
        communicationPrefs {
          emailEnabled
          pushEnabled
        }
      }
      location {
        city
        state
        country
      }
      interests {
        eventCategoryId
        slug
        name
        iconName
        description
        color
      }
    }
  }
`);
