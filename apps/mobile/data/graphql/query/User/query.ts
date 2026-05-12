import { graphql } from '../../types';

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
