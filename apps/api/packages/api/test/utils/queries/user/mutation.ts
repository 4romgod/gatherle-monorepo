export const getCreateUserMutation = (user: any) => {
  return {
    query: `mutation CreateUser($input: CreateUserInputType!) {
            createUser(input: $input) {
              userId
              email
              username
              address
              token
            }
        }`,
    variables: {
      input: user,
    },
  };
};

export const getUpdateUserMutation = (user: any) => {
  return {
    query: `mutation UpdateUser($input: UpdateUserInputType!) {
            updateUser(input: $input) {
              userId
              email
              username
              address
              family_name
              userRole
            }
        }`,
    variables: {
      input: user,
    },
  };
};

export const getLoginUserMutation = (loginData: any) => {
  return {
    query: `mutation LoginUser($input: LoginUserInputType!) {
            loginUser(input: $input) {
                userId
                email
                token
            }
        }`,
    variables: {
      input: loginData,
    },
  };
};

export const getDeleteUserByIdMutation = (userId: string) => {
  return {
    query: `mutation DeleteUserById($userId: String!) {
            deleteUserById(userId: $userId) {
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

export const getDeleteUserByEmailMutation = (email: string) => {
  return {
    query: `mutation DeleteUserByEmail($email: String!) {
            deleteUserByEmail(email: $email) {
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

export const getDeleteUserByUsernameMutation = (username: string) => {
  return {
    query: `mutation DeleteUserByUsername($username: String!) {
            deleteUserByUsername(username: $username) {
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
