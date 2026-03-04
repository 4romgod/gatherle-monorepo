import { graphql } from '@/data/graphql/types';

export const RegisterUserDocument = graphql(`
  mutation RegisterUser($input: CreateUserInput!) {
    createUser(input: $input) {
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
      token
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

export const LoginUserDocument = graphql(`
  mutation LoginUser($input: LoginUserInput!) {
    loginUser(input: $input) {
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
      token
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

export const UpdateUserDocument = graphql(`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
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
      location {
        city
        state
        country
      }
      followPolicy
      followersListVisibility
      followingListVisibility
      defaultVisibility
      shareRSVPByDefault
      shareCheckinsByDefault
      preferences {
        communicationPrefs {
          emailEnabled
          pushEnabled
        }
        notificationPrefs
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

export const DeleteUserByIdDocument = graphql(`
  mutation DeleteUserById($userId: String!) {
    deleteUserById(userId: $userId) {
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

export const RequestEmailVerificationDocument = graphql(`
  mutation RequestEmailVerification($email: String!) {
    requestEmailVerification(email: $email)
  }
`);

export const VerifyEmailDocument = graphql(`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      userId
      email
      username
      emailVerified
    }
  }
`);

export const ForgotPasswordDocument = graphql(`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`);

export const ResetPasswordDocument = graphql(`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`);
