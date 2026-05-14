import { graphql } from '../../types';

export const GetUsersDocument = graphql(`
  query GetUsers($options: QueryOptionsInput) {
    readUsers(options: $options) {
      userId
      email
      username
      bio
      birthdate
      family_name
      gender
      given_name
      phone_number
      profile_picture
      defaultVisibility
      userRole
      followersCount
      location {
        city
        state
        country
        coordinates {
          latitude
          longitude
        }
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

export const GetUserProfileDocument = graphql(`
  query GetUserProfile($username: String!) {
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
