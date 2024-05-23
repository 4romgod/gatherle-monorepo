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
      userType
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
      userType
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
      startDate
      endDate
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
        userType
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
        userType
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
      startDate
      endDate
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
        userType
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
        userType
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
      userType
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
      userType
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
