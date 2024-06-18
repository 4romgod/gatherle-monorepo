import bcrypt from 'bcrypt';
import {UserDAO} from '@/mongodb/dao';
import {User} from '@/mongodb/models';
import {CreateUserInputType, UpdateUserInputType, QueryOptionsInput, Gender, UserRole, SortOrderInput} from '@/graphql/types';
import {ErrorTypes, CustomError, KnownCommonError, transformOptionsToQuery} from '@/utils';
import {ERROR_MESSAGES} from '@/validation';
import {generateToken} from '@/utils/auth';

jest.mock('@/mongodb/models', () => ({
    User: {
        create: jest.fn(),
        findById: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        findByIdAndDelete: jest.fn(),
        findOneAndDelete: jest.fn(),
    },
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('@/utils/auth', () => ({
    generateToken: jest.fn(),
}));

jest.mock('@/utils/queries/query', () => ({
    transformOptionsToQuery: jest.fn(),
}));

const createMockSuccessMongooseQuery = <T>(result: T) => ({
    ...result,
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
});

const createMockFailedMongooseQuery = <T>(error: T) => ({
    ...error,
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockRejectedValue(error),
    select: jest.fn().mockReturnThis(),
});

describe('UserDAO', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockCreateUserInput: CreateUserInputType = {
        email: 'test@example.com',
        password: 'password',
        username: 'testUser',
        address: 'USA, Seattle, 8000',
        birthdate: '1997-07-05',
        family_name: 'Bezos',
        gender: Gender.Male,
        given_name: 'Jeff',
        phone_number: '+12345678990',
        profile_picture: '',
    };

    let mockUser: any = {
        ...mockCreateUserInput,
        id: 'mockUserId',
        encrypted_password: 'encrypted_password',
        userRole: UserRole.User,
    };

    describe('create', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should create a user and return the user object with token', async () => {
            const toObject = jest.fn().mockReturnValue(mockUser);
            mockUser.toObject = toObject;
            (bcrypt.hash as jest.Mock).mockResolvedValue('encrypted_password');
            (generateToken as jest.Mock).mockReturnValue('mockToken');
            (User.create as jest.Mock).mockResolvedValue({
                mockUser,
                toObject: jest.fn().mockReturnValue(mockUser),
            });

            const result = await UserDAO.create(mockCreateUserInput);

            expect(result).toEqual({...mockUser, token: 'mockToken'});
            expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
            expect(generateToken).toHaveBeenCalledWith(mockUser);
        });

        it('should create a user (with default username) and return the user object with token', async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('encrypted_password');
            (generateToken as jest.Mock).mockReturnValue('mockToken');
            (User.create as jest.Mock).mockResolvedValue({
                ...mockUser,
                username: 'test',
                toObject: jest.fn().mockReturnValue({...mockUser, username: 'test'}),
            });

            const result = await UserDAO.create({...mockCreateUserInput, username: undefined});

            expect(result).toEqual({...mockUser, username: 'test', token: 'mockToken'});
            expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
            expect(generateToken).toHaveBeenCalledWith({...mockUser, username: 'test'});
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const mockError = new Error('Mongodb Error');
            (bcrypt.hash as jest.Mock).mockRejectedValue(mockError);

            await expect(UserDAO.create(mockCreateUserInput)).rejects.toThrow(KnownCommonError(mockError));
        });
    });

    describe('login', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should login a user and return the user object with token', async () => {
            const mockLoginUserInput = {
                email: 'test@example.com',
                password: 'password',
            };

            const mockUser = {
                _id: 'mockUserId',
                email: 'test@example.com',
                encrypted_password: 'encrypted_password',
                toObject: jest.fn().mockReturnValue({_id: 'mockUserId', email: 'test@example.com'}),
            };

            (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (generateToken as jest.Mock).mockReturnValue('mockToken');

            const result = await UserDAO.login(mockLoginUserInput);

            expect(result).toEqual({...mockUser.toObject(), token: 'mockToken'});
            expect(User.findOne).toHaveBeenCalledWith({email: 'test@example.com'});
            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'encrypted_password');
            expect(generateToken).toHaveBeenCalledWith(mockUser.toObject());
        });

        it('should throw UNAUTHENTICATED error when password mismatch', async () => {
            const mockLoginUserInput = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            const mockUser = {
                _id: 'mockUserId',
                email: 'test@example.com',
                encrypted_password: 'encrypted_password',
            };

            (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(UserDAO.login(mockLoginUserInput)).rejects.toThrow(
                CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED),
            );
        });

        it('should throw UNAUTHENTICATED error when user not found', async () => {
            const mockLoginUserInput = {
                email: 'test@example.com',
                password: 'password',
            };

            (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

            await expect(UserDAO.login(mockLoginUserInput)).rejects.toThrow(
                CustomError(ERROR_MESSAGES.PASSWORD_MISSMATCH, ErrorTypes.UNAUTHENTICATED),
            );
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const mockLoginUserInput = {
                email: 'test@example.com',
                password: 'password',
            };

            const mockError = new Error('Mongodb Error');
            (User.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.login(mockLoginUserInput)).rejects.toThrow(KnownCommonError(mockError));
        });
    });

    describe('readUserById', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should read a user by ID and return the user object', async () => {
            const userId = 'mockUserId';
            const mockUser: any = {
                _id: 'mockUserId',
                email: 'test@example.com',
            };
            const toObject = jest.fn().mockReturnValue(mockUser);
            mockUser.toObject = toObject;

            (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

            const result = await UserDAO.readUserById(userId);

            expect(result).toEqual(mockUser.toObject());
            expect(User.findById).toHaveBeenCalledWith(userId);
        });

        it('should throw NOT_FOUND error when user not found', async () => {
            const userId = 'mockUserId';

            (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

            await expect(UserDAO.readUserById(userId)).rejects.toThrow(CustomError(`User with id ${userId} does not exist`, ErrorTypes.NOT_FOUND));
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const userId = 'mockUserId';
            const mockError = new Error('Mongodb Error');
            (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.readUserById(userId)).rejects.toThrow(KnownCommonError(mockError));
        });
    });

    describe('readUserByUsername', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should read a user by username and return the user object', async () => {
            const username = 'testUser';
            const mockUser: any = {
                _id: 'mockUserId',
                email: 'test@example.com',
                username: 'testUser',
            };
            const toObject = jest.fn().mockReturnValue(mockUser);
            mockUser.toObject = toObject;

            (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

            const result = await UserDAO.readUserByUsername(username);

            expect(result).toEqual(mockUser.toObject());
            expect(User.findOne).toHaveBeenCalledWith({username: 'testUser'});
        });

        it('should throw NOT_FOUND error when user not found', async () => {
            const username = 'nonExistingUser';

            (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

            await expect(UserDAO.readUserByUsername(username)).rejects.toThrow(
                CustomError(`User with username ${username} does not exist`, ErrorTypes.NOT_FOUND),
            );
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const username = 'testUser';
            const mockError = new Error('Mongodb Error');
            (User.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.readUserByUsername(username)).rejects.toThrow(KnownCommonError(mockError));
        });
    });

    describe('readUserByEmail', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should read a user by email and return the user object', async () => {
            const email = 'test@example.com';
            const mockUser: any = {
                _id: 'mockUserId',
                email: 'test@example.com',
                username: 'testUser',
            };
            const toObject = jest.fn().mockReturnValue(mockUser);
            mockUser.toObject = toObject;

            (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

            const result = await UserDAO.readUserByEmail(email);

            expect(result).toEqual(mockUser.toObject());
            expect(User.findOne).toHaveBeenCalledWith({email: 'test@example.com'});
        });

        it('should throw NOT_FOUND error when user not found', async () => {
            const email = 'nonexisting@example.com';

            (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

            await expect(UserDAO.readUserByEmail(email)).rejects.toThrow(
                CustomError(`User with email ${email} does not exist`, ErrorTypes.NOT_FOUND),
            );
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const email = 'test@example.com';
            const mockError = new Error('Mongodb Error');
            (User.findOne as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.readUserByEmail(email)).rejects.toThrow(KnownCommonError(mockError));
        });
    });

    describe('readUsers', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should read ALL users and return an array of user objects when no filters provided', async () => {
            const mockUsers: any[] = [
                {
                    _id: 'mockUserId1',
                    email: 'test1@example.com',
                    username: 'testUser1',
                },
                {
                    _id: 'mockUserId2',
                    email: 'test2@example.com',
                    username: 'testUser2',
                },
            ];

            (User.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUsers));

            const result = await UserDAO.readUsers();

            expect(result).toEqual(mockUsers);
            expect(User.find).toHaveBeenCalledWith({});
        });

        it('should read users with options and return an array of user objects', async () => {
            const options: QueryOptionsInput = {
                sort: [
                    {
                        field: 'given_name',
                        order: SortOrderInput.asc,
                    },
                ],
            };

            const mockUsers: any[] = [
                {
                    _id: 'mockUserId1',
                    email: 'test1@example.com',
                    username: 'testUser1',
                },
                {
                    _id: 'mockUserId2',
                    email: 'test2@example.com',
                    username: 'testUser2',
                },
            ];

            (transformOptionsToQuery as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUsers));

            const result = await UserDAO.readUsers(options);

            expect(result).toEqual(mockUsers);
            expect(transformOptionsToQuery).toHaveBeenCalledWith(User, options);
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const mockError = new Error('Mongodb Error');
            (User.find as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.readUsers()).rejects.toThrow(KnownCommonError({}));
        });
    });

    describe('updateUser', () => {
        const mockUpdateUserInput: UpdateUserInputType = {
            id: 'mockUserId',
            email: 'updated@example.com',
            username: 'updatedUser',
            password: 'newpassword',
        };

        it('should update a user and return the updated user object', async () => {
            const mockUpdatedUser = {
                id: 'mockUserId',
                email: 'updated@example.com',
                username: 'updatedUser',
                encrypted_password: 'encrypted_newpassword',
            };

            (bcrypt.hash as jest.Mock).mockResolvedValue('encrypted_newpassword');
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUpdatedUser));

            const result = await UserDAO.updateUser(mockUpdateUserInput);

            expect(result).toEqual(mockUpdatedUser);
            expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'mockUserId',
                {
                    email: 'updated@example.com',
                    username: 'updatedUser',
                    encrypted_password: 'encrypted_newpassword',
                },
                {new: true},
            );
        });

        it('should throw NOT_FOUND error when user not found', async () => {
            const mockUpdateUserInputNotFound: UpdateUserInputType = {
                id: 'nonExistingUserId',
                email: 'updated@example.com',
                username: 'updatedUser',
                password: 'newpassword',
            };

            (bcrypt.hash as jest.Mock).mockResolvedValue('encrypted_newpassword');
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

            await expect(UserDAO.updateUser(mockUpdateUserInputNotFound)).rejects.toThrow(
                CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingUserId'), ErrorTypes.NOT_FOUND),
            );
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const mockError = new Error('Mongodb Error');
            (bcrypt.hash as jest.Mock).mockRejectedValue(mockError);
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.updateUser(mockUpdateUserInput)).rejects.toThrow(KnownCommonError(mockError));
        });
    });

    describe('deleteUserById', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should delete a user by ID and return the deleted user object', async () => {
            const userId = 'mockUserId';
            const mockDeletedUser = {
                _id: 'mockUserId',
                email: 'deleted@example.com',
                username: 'deletedUser',
            };

            (User.findByIdAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockDeletedUser));

            const result = await UserDAO.deleteUserById(userId);

            expect(result).toEqual(mockDeletedUser);
            expect(User.findByIdAndDelete).toHaveBeenCalledWith(userId);
        });

        it('should throw NOT_FOUND error when user not found', async () => {
            const nonExistingUserId = 'nonExistingUserId';

            (User.findByIdAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

            await expect(UserDAO.deleteUserById(nonExistingUserId)).rejects.toThrow(
                CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', nonExistingUserId), ErrorTypes.NOT_FOUND),
            );
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const userId = 'mockUserId';
            const mockError = new Error('Mongodb Error');
            (User.findByIdAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.deleteUserById(userId)).rejects.toThrow(KnownCommonError(mockError));
        });
    });

    describe('deleteUserByEmail', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should delete a user by email and return the deleted user object', async () => {
            const email = 'deleted@example.com';
            const mockDeletedUser = {
                _id: 'mockUserId',
                email: 'deleted@example.com',
                username: 'deletedUser',
            };

            (User.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockDeletedUser));

            const result = await UserDAO.deleteUserByEmail(email);

            expect(result).toEqual(mockDeletedUser);
            expect(User.findOneAndDelete).toHaveBeenCalledWith({email: 'deleted@example.com'});
        });

        it('should throw NOT_FOUND error when user not found', async () => {
            const nonExistingEmail = 'nonexisting@example.com';

            (User.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

            await expect(UserDAO.deleteUserByEmail(nonExistingEmail)).rejects.toThrow(CustomError('User not found', ErrorTypes.NOT_FOUND));
        });

        it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
            const email = 'deleted@example.com';
            const mockError = new Error('Mongodb Error');
            (User.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

            await expect(UserDAO.deleteUserByEmail(email)).rejects.toThrow(KnownCommonError(mockError));
        });
    });
});
