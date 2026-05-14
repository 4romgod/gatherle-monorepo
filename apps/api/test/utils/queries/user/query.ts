import type { QueryOptionsInput } from '@gatherle/commons/types';

export const getReadUserByIdQuery = (userId: string) => {
  return {
    query: `query GetUserById($userId: String!) {
            readUserById(userId: $userId) {
              userId
              email
              username
            }
        }`,
    variables: {
      userId: userId,
    },
  };
};

export const getReadUserByEmailQuery = (email: string) => {
  return {
    query: `query GetUserByEmail($email: String!) {
            readUserByEmail(email: $email) {
              userId
              email
              username
            }
        }`,
    variables: {
      email: email,
    },
  };
};

export const getReadUserByUsernameQuery = (username: string) => {
  return {
    query: `query GetUserByUsername($username: String!) {
            readUserByUsername(username: $username) {
              userId
              email
              username
            }
        }`,
    variables: {
      username: username,
    },
  };
};

export const getReadUsersWithoutOptionsQuery = () => {
  return {
    query: `query GetUsers {
            readUsers {
              userId
              email
              username
            }
        }`,
  };
};

export const getReadUsersWithOptionsQuery = (options: QueryOptionsInput) => {
  return {
    query: `query GetUsers($options: QueryOptionsInput!) {
            readUsers(options: $options) {
              userId
              email
              username
            }
        }`,
    variables: {
      options: options,
    },
  };
};
