import { graphql } from '@/data/graphql/types';

const RegisterUserDocument = graphql(`
  mutation RegisterUser($input: CreateUserInputType!) {
    createUser(input: $input) {
      userId
      email
      username
      address
      birthdate
      given_name
      family_name
      gender
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
      userId
      email
      username
      address
      birthdate
      given_name
      family_name
      gender
      phone_number
      profile_picture
      userRole
      token
    }
  }
`);

const GetAllEventsDocument = graphql(`
  query GetAllEvents($options: QueryOptionsInput) {
    readEvents(options: $options) {
      eventId
      slug
      title
      description
      eventCategoryList {
        eventCategoryId
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
      location {
        locationType
        coordinates {
          latitude
          longitude
        }
        address {
          street
          city
          state
          zipCode
          country
        }
        details
      }
      recurrenceRule
      media {
        featuredImageUrl
      }
      organizerList {
        userId
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
        phone_number
        profile_picture
        userRole
      }
      rSVPList {
        userId
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
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
      eventId
      slug
      title
      description
      eventCategoryList {
        eventCategoryId
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
      location {
        locationType
        coordinates {
          latitude
          longitude
        }
        address {
          street
          city
          state
          zipCode
          country
        }
        details
      }
      recurrenceRule
      media {
        featuredImageUrl
      }
      organizerList {
        userId
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
        phone_number
        profile_picture
        userRole
      }
      rSVPList {
        userId
        email
        username
        address
        birthdate
        family_name
        gender
        given_name
        phone_number
        profile_picture
        userRole
      }
    }
  }
`);

const DeleteEventByIdDocument = graphql(`
  mutation DeleteEventById($eventId: String!) {
    deleteEventById(eventId: $eventId) {
      eventId
      slug
      title
      description
      recurrenceRule
      location {
        locationType
        coordinates {
          latitude
          longitude
        }
        address {
          street
          city
          state
          zipCode
          country
        }
        details
      }
      organizerList {
        userId
        email
        username
        address
        birthdate
        family_name
        userRole
      }
    }
  }
`);

const GetAllUsersDocument = graphql(`
  query GetAllUsers {
    readUsers {
      userId
      email
      username
      address
      birthdate
      family_name
      gender
      given_name
      phone_number
      profile_picture
      userRole
    }
  }
`);

const GetUserByUsernameDocument = graphql(`
  query GetUserByUsername($username: String!) {
    readUserByUsername(username: $username) {
      userId
      email
      username
      address
      birthdate
      family_name
      gender
      given_name
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
        eventCategoryId
        slug
        name
        iconName
        description
        color
      }
    }
  `);
