import { graphql } from '@/lib/graphql/types';

const GetAllEventsDocument = graphql(`
  query GetAllEvents {
    readEvents {
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
