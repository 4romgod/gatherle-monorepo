import { UserDAO } from '@/mongodb/dao';
import { User } from '@/mongodb/models';
import type { CreateUserInput, UpdateUserInput, QueryOptionsInput } from '@gatherle/commons/types';
import { SortOrderInput } from '@gatherle/commons/types';
import { Gender, UserRole } from '@gatherle/commons/types/user';
import { ErrorTypes, CustomError, KnownCommonError, transformOptionsToQuery } from '@/utils';
import { ERROR_MESSAGES } from '@/validation';
import { generateToken } from '@/utils/auth';

jest.mock('@/mongodb/models', () => ({
  User: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  Organization: {
    findById: jest.fn(),
  },
}));

import { Organization } from '@/mongodb/models';

jest.mock('bcryptjs', () => ({
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

  const mockCreateUserInput: CreateUserInput = {
    email: 'test@example.com',
    password: 'password',
    username: 'testUser',
    location: {
      city: 'Durban',
      state: 'KZN',
      country: 'South Africa',
    },
    interests: [],
    birthdate: '1997-07-05',
    family_name: 'Bezos',
    gender: Gender.Male,
    given_name: 'Jeff',
    phone_number: '+12345678990',
    profile_picture: '',
  };

  const mockUser: any = {
    ...mockCreateUserInput,
    id: 'mockUserId',
    userRole: UserRole.User,
  };

  describe('create', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create a user and return the user object with token', async () => {
      (generateToken as jest.Mock).mockReturnValue('mockToken');
      (User.create as jest.Mock).mockResolvedValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockUser,
        }),
      );

      const result = await UserDAO.create(mockCreateUserInput);

      expect(result).toEqual({ ...mockUser, token: 'mockToken' });
      expect(generateToken).toHaveBeenCalledWith(mockUser);
    });

    it('should create a user (with default username) and return the user object with token', async () => {
      (generateToken as jest.Mock).mockReturnValue('mockToken');
      (User.create as jest.Mock).mockResolvedValue(
        createMockSuccessMongooseQuery({
          toObject: () => {
            return {
              ...mockUser,
              username: 'test',
            };
          },
        }),
      );

      const result = await UserDAO.create({ ...mockCreateUserInput, username: undefined });

      expect(result).toEqual({ ...mockUser, username: 'test', token: 'mockToken' });
      expect(generateToken).toHaveBeenCalledWith({ ...mockUser, username: 'test' });
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
      const mockError = new Error('Mongodb Error');
      (User.create as jest.Mock).mockRejectedValue(mockError);

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
      };

      (User.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockUser,
          comparePassword: () => true,
        }),
      );
      (generateToken as jest.Mock).mockReturnValue('mockToken');

      const result = await UserDAO.login(mockLoginUserInput);

      expect(result).toEqual({ ...mockUser, token: 'mockToken' });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(generateToken).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UNAUTHENTICATED error when password mismatch', async () => {
      const mockLoginUserInput = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        _id: 'mockUserId',
        email: 'test@example.com',
      };

      (User.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockUser,
          comparePassword: () => false,
        }),
      );

      await expect(UserDAO.login(mockLoginUserInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.PASSWORD_MISMATCH, ErrorTypes.UNAUTHENTICATED),
      );
    });

    it('should throw UNAUTHENTICATED error when user not found', async () => {
      const mockLoginUserInput = {
        email: 'test@example.com',
        password: 'password',
      };

      (User.findOne as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.login(mockLoginUserInput)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.PASSWORD_MISMATCH, ErrorTypes.UNAUTHENTICATED),
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

      (User.findById as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockUser,
        }),
      );

      const result = await UserDAO.readUserById(userId);

      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NOT_FOUND error when user not found', async () => {
      const userId = 'mockUserId';

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.readUserById(userId)).rejects.toThrow(
        CustomError(`User with id ${userId} does not exist`, ErrorTypes.NOT_FOUND),
      );
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

      (User.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockUser,
        }),
      );

      const result = await UserDAO.readUserByUsername(username);

      expect(result).toEqual(mockUser);
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testUser' });
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
      (User.findOne as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockUser,
        }),
      );

      const result = await UserDAO.readUserByEmail(email);

      expect(result).toEqual(mockUser);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
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

      const mockResults = mockUsers.map((user) => ({ toObject: () => user }));
      (transformOptionsToQuery as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockResults));

      const result = await UserDAO.readUsers();

      expect(result).toEqual(mockUsers);
      expect(transformOptionsToQuery).toHaveBeenCalledWith(User, {
        filters: [
          {
            field: 'isTestUser',
            operator: 'ne',
            value: true,
          },
        ],
      });
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

      const mockResults = mockUsers.map((user) => ({ toObject: () => user }));
      (transformOptionsToQuery as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockResults));

      const result = await UserDAO.readUsers(options);

      expect(result).toEqual(mockUsers);
      expect(transformOptionsToQuery).toHaveBeenCalledWith(User, {
        ...options,
        filters: [
          {
            field: 'isTestUser',
            operator: 'ne',
            value: true,
          },
        ],
      });
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
      const mockError = new Error('Mongodb Error');
      (transformOptionsToQuery as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.readUsers()).rejects.toThrow(KnownCommonError({}));
    });
  });

  describe('updateUser', () => {
    const mockUpdateUserInput: UpdateUserInput = {
      userId: 'mockUserId',
      email: 'updated@example.com',
      username: 'updatedUser',
    };

    it('should update a user and return the updated user object', async () => {
      const mockUpdatedUser = {
        userId: 'mockUserId',
        email: 'updated@example.com',
        username: 'updatedUser',
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId: 'mockUserId',
          email: 'updated@example.com',
          username: 'updatedUser',
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUpdatedUser));

      const result = await UserDAO.updateUser(mockUpdateUserInput);

      expect(result).toEqual({
        userId: 'mockUserId',
        email: 'updated@example.com',
        username: 'updatedUser',
      });
      expect(User.findById).toHaveBeenCalledWith('mockUserId');
      expect(mockUpdatedUser.save).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND error when user not found', async () => {
      const mockUpdateUserInputNotFound: UpdateUserInput = {
        userId: 'nonExistingUserId',
        email: 'updated@example.com',
        username: 'updatedUser',
        interests: [],
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.updateUser(mockUpdateUserInputNotFound)).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingUserId'), ErrorTypes.NOT_FOUND),
      );
      expect(User.findById).toHaveBeenCalledWith('nonExistingUserId');
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.updateUser(mockUpdateUserInput)).rejects.toThrow(KnownCommonError(mockError));
      expect(User.findById).toHaveBeenCalledWith('mockUserId');
    });
  });

  describe('deleteUserById', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should delete a user by ID and return the deleted user object', async () => {
      const userId = 'mockUserId';
      const mockDeletedUser = {
        userId: 'mockUserId',
        email: 'deleted@example.com',
        username: 'deletedUser',
      };

      (User.findByIdAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockDeletedUser,
        }),
      );

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

      (User.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockDeletedUser,
        }),
      );

      const result = await UserDAO.deleteUserByEmail(email);

      expect(result).toEqual(mockDeletedUser);
      expect(User.findOneAndDelete).toHaveBeenCalledWith({ email: 'deleted@example.com' });
    });

    it('should throw NOT_FOUND error when user not found', async () => {
      const nonExistingEmail = 'nonexisting@example.com';

      (User.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.deleteUserByEmail(nonExistingEmail)).rejects.toThrow(
        CustomError('User not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
      const email = 'deleted@example.com';
      const mockError = new Error('Mongodb Error');
      (User.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.deleteUserByEmail(email)).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('deleteUserByUsername', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should delete a user by username and return the deleted user object', async () => {
      const username = 'deletedUser';
      const mockDeletedUser = {
        _id: 'mockUserId',
        email: 'deleted@example.com',
        username: 'deletedUser',
      };

      (User.findOneAndDelete as jest.Mock).mockReturnValue(
        createMockSuccessMongooseQuery({
          toObject: () => mockDeletedUser,
        }),
      );

      const result = await UserDAO.deleteUserByUsername(username);

      expect(result).toEqual(mockDeletedUser);
      expect(User.findOneAndDelete).toHaveBeenCalledWith({ username: 'deletedUser' });
    });

    it('should throw NOT_FOUND error when user not found', async () => {
      const nonExistingUsername = 'nonexistingUsername';

      (User.findOneAndDelete as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.deleteUserByUsername(nonExistingUsername)).rejects.toThrow(
        CustomError('User not found', ErrorTypes.NOT_FOUND),
      );
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
      const username = 'deletedUser';
      const mockError = new Error('Mongodb Error');
      (User.findOneAndDelete as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.deleteUserByUsername(username)).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('promoteUserToAdmin', () => {
    it('should promote a user to ADMIN and return the updated user object', async () => {
      const mockUser = {
        userId: 'mockUserId',
        userRole: UserRole.Admin,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId: 'mockUserId',
          userRole: UserRole.Admin,
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.promoteUserToAdmin('mockUserId');

      expect(result).toEqual({
        userId: 'mockUserId',
        userRole: UserRole.Admin,
      });
      expect(User.findById).toHaveBeenCalledWith('mockUserId');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND error when user not found', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.promoteUserToAdmin('nonExistingUserId')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingUserId'), ErrorTypes.NOT_FOUND),
      );
      expect(User.findById).toHaveBeenCalledWith('nonExistingUserId');
    });

    it('should throw INTERNAL_SERVER_ERROR GraphQLError when an unknown error occurs', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.promoteUserToAdmin('anyId')).rejects.toThrow(KnownCommonError(mockError));
      expect(User.findById).toHaveBeenCalledWith('anyId');
    });
  });

  describe('blockUser', () => {
    it('should add a user to blocked list and return updated user', async () => {
      const userId = 'mockUserId';
      const blockedUserId = 'userToBlock';
      const mockUser = {
        userId,
        blockedUserIds: [],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          blockedUserIds: [blockedUserId],
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.blockUser(userId, blockedUserId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        blockedUserIds: [blockedUserId],
      });
    });

    it('should return existing user if already blocked', async () => {
      const userId = 'mockUserId';
      const blockedUserId = 'userToBlock';
      const mockUser = {
        userId,
        blockedUserIds: [blockedUserId],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          blockedUserIds: [blockedUserId],
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.blockUser(userId, blockedUserId);

      expect(mockUser.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        blockedUserIds: [blockedUserId],
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.blockUser('nonExistingId', 'userToBlock')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should throw BAD_USER_INPUT when trying to block yourself', async () => {
      await expect(UserDAO.blockUser('userId', 'userId')).rejects.toThrow(
        CustomError('You cannot block yourself', ErrorTypes.BAD_USER_INPUT),
      );
    });

    it('should throw NOT_FOUND when blocked user does not exist', async () => {
      const mockUser = { userId: 'userId', blockedUserIds: [] };
      (User.findById as jest.Mock)
        .mockReturnValueOnce(createMockSuccessMongooseQuery(mockUser))
        .mockReturnValueOnce(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.blockUser('userId', 'nonExistingBlockedUser')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingBlockedUser'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.blockUser('userId', 'blockedUserId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('unblockUser', () => {
    it('should remove a user from blocked list and return updated user', async () => {
      const userId = 'mockUserId';
      const blockedUserId = 'userToUnblock';
      const mockUser = {
        userId,
        blockedUserIds: [blockedUserId],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          blockedUserIds: [],
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.unblockUser(userId, blockedUserId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        blockedUserIds: [],
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.unblockUser('nonExistingId', 'userToUnblock')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.unblockUser('userId', 'blockedUserId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('readBlockedUsers', () => {
    it('should return list of blocked users', async () => {
      const userId = 'mockUserId';
      const blockedUserIds = ['blocked1', 'blocked2'];
      const mockUser = {
        userId,
        blockedUserIds,
      };
      const blockedUserDocs = [
        {
          userId: 'blocked1',
          username: 'user1',
          toObject: jest.fn().mockReturnValue({ userId: 'blocked1', username: 'user1' }),
        },
        {
          userId: 'blocked2',
          username: 'user2',
          toObject: jest.fn().mockReturnValue({ userId: 'blocked2', username: 'user2' }),
        },
      ];

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));
      (User.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(blockedUserDocs));

      const result = await UserDAO.readBlockedUsers(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(User.find).toHaveBeenCalledWith({ userId: { $in: blockedUserIds } });
      expect(result).toEqual([
        { userId: 'blocked1', username: 'user1' },
        { userId: 'blocked2', username: 'user2' },
      ]);
    });

    it('should return empty array when user has no blocked users', async () => {
      const userId = 'mockUserId';
      const mockUser = {
        userId,
        blockedUserIds: [],
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.readBlockedUsers(userId);

      expect(result).toEqual([]);
      expect(User.find).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.readBlockedUsers('nonExistingId')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.readBlockedUsers('userId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  // ============ MUTE USER METHODS ============

  describe('muteUser', () => {
    it('should add a user to muted list and return updated user', async () => {
      const userId = 'mockUserId';
      const mutedUserId = 'userToMute';
      const mockUser = {
        userId,
        mutedUserIds: [],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          mutedUserIds: [mutedUserId],
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.muteUser(userId, mutedUserId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        mutedUserIds: [mutedUserId],
      });
    });

    it('should throw BAD_USER_INPUT when trying to mute yourself', async () => {
      await expect(UserDAO.muteUser('userId', 'userId')).rejects.toThrow(
        CustomError('You cannot mute yourself', ErrorTypes.BAD_USER_INPUT),
      );
    });

    it('should return existing user if already muted', async () => {
      const userId = 'mockUserId';
      const mutedUserId = 'userToMute';
      const mockUser = {
        userId,
        mutedUserIds: [mutedUserId],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          mutedUserIds: [mutedUserId],
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.muteUser(userId, mutedUserId);

      expect(mockUser.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        mutedUserIds: [mutedUserId],
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.muteUser('nonExistingId', 'userToMute')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.muteUser('userId', 'mutedUserId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('unmuteUser', () => {
    it('should remove a user from muted list and return updated user', async () => {
      const userId = 'mockUserId';
      const mutedUserId = 'userToUnmute';
      const mockUser = {
        userId,
        mutedUserIds: [mutedUserId],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          mutedUserIds: [],
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.unmuteUser(userId, mutedUserId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        mutedUserIds: [],
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.unmuteUser('nonExistingId', 'userToUnmute')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.unmuteUser('userId', 'mutedUserId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('readMutedUsers', () => {
    it('should return list of muted users', async () => {
      const userId = 'mockUserId';
      const mutedUserIds = ['muted1', 'muted2'];
      const mockUser = {
        userId,
        mutedUserIds,
      };
      const mutedUserDocs = [
        {
          userId: 'muted1',
          username: 'user1',
          toObject: jest.fn().mockReturnValue({ userId: 'muted1', username: 'user1' }),
        },
        {
          userId: 'muted2',
          username: 'user2',
          toObject: jest.fn().mockReturnValue({ userId: 'muted2', username: 'user2' }),
        },
      ];

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));
      (User.find as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mutedUserDocs));

      const result = await UserDAO.readMutedUsers(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(User.find).toHaveBeenCalledWith({ userId: { $in: mutedUserIds } });
      expect(result).toEqual([
        { userId: 'muted1', username: 'user1' },
        { userId: 'muted2', username: 'user2' },
      ]);
    });

    it('should return empty array when user has no muted users', async () => {
      const userId = 'mockUserId';
      const mockUser = {
        userId,
        mutedUserIds: [],
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.readMutedUsers(userId);

      expect(result).toEqual([]);
      expect(User.find).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.readMutedUsers('nonExistingId')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.readMutedUsers('userId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  // ============ MUTE ORGANIZATION METHODS ============

  describe('muteOrganization', () => {
    it('should add an organization to muted list and return updated user', async () => {
      const userId = 'mockUserId';
      const orgId = 'orgToMute';
      const mockUser = {
        userId,
        mutedOrgIds: [],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          mutedOrgIds: [orgId],
        }),
      };
      const mockOrganization = { organizationId: orgId };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));
      (Organization.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockOrganization));

      const result = await UserDAO.muteOrganization(userId, orgId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(Organization.findById).toHaveBeenCalledWith(orgId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        mutedOrgIds: [orgId],
      });
    });

    it('should return existing user if organization already muted', async () => {
      const userId = 'mockUserId';
      const orgId = 'orgToMute';
      const mockUser = {
        userId,
        mutedOrgIds: [orgId],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          mutedOrgIds: [orgId],
        }),
      };
      const mockOrganization = { organizationId: orgId };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));
      (Organization.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockOrganization));

      const result = await UserDAO.muteOrganization(userId, orgId);

      expect(mockUser.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        mutedOrgIds: [orgId],
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));
      (Organization.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery({ organizationId: 'org1' }));

      await expect(UserDAO.muteOrganization('nonExistingId', 'orgId')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should throw NOT_FOUND when organization does not exist', async () => {
      const mockUser = { userId: 'userId', mutedOrgIds: [] };
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));
      (Organization.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.muteOrganization('userId', 'nonExistingOrgId')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('Organization', 'ID', 'nonExistingOrgId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.muteOrganization('userId', 'orgId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('unmuteOrganization', () => {
    it('should remove an organization from muted list and return updated user', async () => {
      const userId = 'mockUserId';
      const orgId = 'orgToUnmute';
      const mockUser = {
        userId,
        mutedOrgIds: [orgId],
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId,
          mutedOrgIds: [],
        }),
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.unmuteOrganization(userId, orgId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        userId,
        mutedOrgIds: [],
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.unmuteOrganization('nonExistingId', 'orgId')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.unmuteOrganization('userId', 'orgId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });

  describe('readMutedOrganizationIds', () => {
    it('should return list of muted organization IDs', async () => {
      const userId = 'mockUserId';
      const mutedOrgIds = ['org1', 'org2', 'org3'];
      const mockUser = {
        userId,
        mutedOrgIds,
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.readMutedOrganizationIds(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(['org1', 'org2', 'org3']);
    });

    it('should return empty array when user has no muted organizations', async () => {
      const userId = 'mockUserId';
      const mockUser = {
        userId,
        mutedOrgIds: undefined,
      };

      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(mockUser));

      const result = await UserDAO.readMutedOrganizationIds(userId);

      expect(result).toEqual([]);
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue(createMockSuccessMongooseQuery(null));

      await expect(UserDAO.readMutedOrganizationIds('nonExistingId')).rejects.toThrow(
        CustomError(ERROR_MESSAGES.NOT_FOUND('User', 'ID', 'nonExistingId'), ErrorTypes.NOT_FOUND),
      );
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Mongodb Error');
      (User.findById as jest.Mock).mockReturnValue(createMockFailedMongooseQuery(mockError));

      await expect(UserDAO.readMutedOrganizationIds('userId')).rejects.toThrow(KnownCommonError(mockError));
    });
  });
});
