import type {QueryOptionsInput} from '@ntlango/commons/types';

export const getReadUserByIdQuery = (userId: string) => {
  return {
    query: `query ReadUserById($userId: String!) {
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
    query: `query ReadUserByEmail($email: String!) {
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
    query: `query ReadUserByUsername($username: String!) {
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
    query: `query ReadUsers {
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
    query: `query ReadUsers($options: QueryOptionsInput!) {
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
