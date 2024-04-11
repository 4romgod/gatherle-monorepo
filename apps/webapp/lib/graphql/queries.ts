import { graphql } from '@/lib/graphql/types';

const GetAllEventsDocument = graphql(`
  query GetAllEvents {
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
      comments
      privacySetting
      eventLink
      media {
        featuredImageUrl
      }
      organizers {
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
