export const getCreateUserMutation = (user: any) => {
    return {
        query: `mutation CreateUser($input: CreateUserInputType!) {
            createUser(input: $input) {
              id
              email
              username
              address
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
              id
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
                id
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
            deleteUserById(id: $userId) {
              id
              email
              username
            }
        }`,
        variables: {userId: userId},
    };
};
