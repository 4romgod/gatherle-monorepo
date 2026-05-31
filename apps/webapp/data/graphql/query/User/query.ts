import { graphql } from '@/data/graphql/types';

export const GetUsersDocument = graphql(`
  query GetUsers($options: QueryOptionsInput) {
    readUsers(options: $options) {
      userId
      email
      emailVerified
      hasLocalPassword
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
      followingCount
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

export const GetUserByUsernameDocument = graphql(`
  query GetUserByUsername($username: String!) {
    readUserByUsername(username: $username) {
      userId
      email
      emailVerified
      hasLocalPassword
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
      followingCount
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
      emailVerified
      hasLocalPassword
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
      followingCount
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
