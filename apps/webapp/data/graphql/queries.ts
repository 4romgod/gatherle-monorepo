import { graphql } from '@/data/graphql/types';

const RegisterUserDocument = graphql(`
  mutation RegisterUser($input: CreateUserInputType!) {
    createUser(input: $input) {
      id
      email
      username
      address
      birthdate
      given_name
      family_name
      gender
      encrypted_password
      phone_number
      profile_picture
      userRole
      token
    }
  }
`);

const LoginUserDocument = graphql(`
  mutation LoginUser($input: LoginUserInputType!) {
    loginUser(input: $input) {
      id
      email
      username
      address
      birthdate
      given_name
      family_name
      gender
      encrypted_password
      phone_number
      profile_picture
      userRole
      token
    }
  }
`);

const GetAllEventsDocument = graphql(`
  query GetAllEvents($queryParams: EventQueryParams) {
    readEvents(queryParams: $queryParams) {
      id
      slug
      title
      description
      startDateTime
      endDateTime
      eventCategory {
        id
        slug
        name
        iconName
        description
        color
      }
      capacity
      status
      tags
      comments
      privacySetting
      eventLink
      location
      media {
        featuredImageUrl
      }
      organizers {
        id
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
        encrypted_password
        phone_number
        profile_picture
        userRole
      }
      rSVPs {
        id
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
        encrypted_password
        phone_number
        profile_picture
        userRole
      }
    }
  }
`);

const GetEventBySlugDocument = graphql(`
  query GetEventBySlug($slug: String!) {
    readEventBySlug(slug: $slug) {
      id
      slug
      title
      description
      startDateTime
      endDateTime
      eventCategory {
        id
        slug
        name
        iconName
        description
        color
      }
      capacity
      status
      tags
      comments
      privacySetting
      eventLink
      location
      media {
        featuredImageUrl
      }
      organizers {
        id
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
        encrypted_password
        phone_number
        profile_picture
        userRole
      }
      rSVPs {
        id
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
        encrypted_password
        phone_number
        profile_picture
        userRole
      }
    }
  }
`);

const GetAllUsersDocument = graphql(`
  query GetAllUsers {
    readUsers {
      id
      email
      username
      address
      birthdate
      family_name
      gender
      given_name
      encrypted_password
      phone_number
      profile_picture
      userRole
    }
  }
`);

const GetUserByUsernameDocument = graphql(`
  query GetUserByUsername($username: String!) {
    readUserByUsername(username: $username) {
      id
      email
      username
      address
      birthdate
      family_name
      gender
      given_name
      encrypted_password
      phone_number
      profile_picture
      userRole
    }
  }
`);

const GetAllEventCategoriesDocument = () =>
  graphql(`
    query GetAllEventCategories {
      readEventCategories {
        id
        slug
        name
        iconName
        description
        color
      }
    }
  `);
