import {authChecker, generateToken, verifyToken, isAuthorizedByOperation} from '@/utils';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/validation';
import {UserRole, UserType} from '@/graphql/types';
import {OPERATION_NAMES} from '@/constants';
import {verify, sign} from 'jsonwebtoken';
import {EventDAO} from '@/mongodb/dao';
import {ServerContext} from '@/graphql';
import {ArgsDictionary} from 'type-graphql';
import {GraphQLResolveInfo} from 'graphql';

jest.mock('jsonwebtoken');
jest.mock('@/mongodb/dao');

describe('Auth Utilities', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUser: UserType = {
    userId: 'user-id',
    email: 'user@example.com',
    username: 'username',
    address: '123 Street',
    birthdate: '2000-01-01',
    given_name: 'First',
    family_name: 'Last',
    userRole: UserRole.User,
  };

  const mockAdminUser: UserType = {
    ...mockUser,
    userRole: UserRole.Admin,
  };

  describe('generateToken', () => {
    it('should generate a token', async () => {
      (sign as jest.Mock).mockReturnValue('token');
      const token = await generateToken(mockUser);
      expect(token).toBe('token');
      expect(sign).toHaveBeenCalledWith(mockUser, expect.any(String), {expiresIn: '1h'});
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      (verify as jest.Mock).mockReturnValue({...mockUser, iat: 123, exp: 456});
      const user = await verifyToken('valid-token');
      expect(user).toEqual(mockUser);
    });

    it('should throw an error for an invalid token', async () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      await expect(verifyToken('invalid-token')).rejects.toThrow(CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED));
    });
  });

  describe('isAuthorizedByOperation', () => {
    it('should authorize user for their own update by userId', async () => {
      const result = await isAuthorizedByOperation(OPERATION_NAMES.UPDATE_USER, {input: {userId: 'user-id'}}, mockUser);
      expect(result).toBe(true);
    });

    it("should deny user for another user's update by userId", async () => {
      const result = await isAuthorizedByOperation(OPERATION_NAMES.UPDATE_USER, {input: {userId: 'another-id'}}, mockUser);
      expect(result).toBe(false);
    });

    it('should authorize user for their own event update', async () => {
      (EventDAO.readEventById as jest.Mock).mockResolvedValue({organizerList: [{userId: 'user-id'}]});
      const result = await isAuthorizedByOperation(OPERATION_NAMES.UPDATE_EVENT, {eventId: 'event-id'}, mockUser);
      expect(result).toBe(true);
    });

    it("should deny user for another user's event update", async () => {
      (EventDAO.readEventById as jest.Mock).mockResolvedValue({organizerList: [{userId: 'another-id'}]});
      const result = await isAuthorizedByOperation(OPERATION_NAMES.UPDATE_EVENT, {eventId: 'event-id'}, mockUser);
      expect(result).toBe(false);
    });
  });

  describe('authChecker', () => {
    const mockContext: ServerContext = {token: 'valid-token'};
    const root = null;

    beforeEach(() => {
      (verify as jest.Mock).mockReturnValue({...mockUser, userId: 'current-user-id', iat: 123, exp: 456});
    });

    describe('operation tests', () => {
      const testCases = [
        {
          operationName: OPERATION_NAMES.UPDATE_USER,
          args: {input: {userId: 'current-user-id'}},
          roles: [UserRole.User],
          expectAuthorized: true,
          testDescription: `should AUTHORIZE a user with the correct role and permission for ${OPERATION_NAMES.UPDATE_USER} on item`,
        },
        {
          operationName: OPERATION_NAMES.UPDATE_USER,
          args: {input: {userId: 'another-id'}},
          roles: [UserRole.User],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error when user lacks permission for ${OPERATION_NAMES.UPDATE_USER} on item`,
        },
        {
          operationName: OPERATION_NAMES.UPDATE_USER,
          args: {input: {userId: 'current-user-id'}},
          roles: [UserRole.Guest],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error for user with inccorrect role ${OPERATION_NAMES.UPDATE_USER} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_ID,
          args: {userId: 'current-user-id'},
          roles: [UserRole.User],
          expectAuthorized: true,
          testDescription: `should AUTHORIZE a user with the correct role and permission for ${OPERATION_NAMES.DELETE_USER_BY_ID} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_ID,
          args: {userId: 'another-id'},
          roles: [UserRole.User],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error when user lacks permission for ${OPERATION_NAMES.DELETE_USER_BY_ID} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_ID,
          args: {input: {userId: 'current-user-id'}},
          roles: [UserRole.Guest],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error for user with inccorrect role ${OPERATION_NAMES.DELETE_USER_BY_ID} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_EMAIL,
          args: {email: 'user@example.com'},
          roles: [UserRole.User],
          expectAuthorized: true,
          testDescription: `should AUTHORIZE a user with the correct role and permission for ${OPERATION_NAMES.DELETE_USER_BY_EMAIL} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_EMAIL,
          args: {userId: 'another@email.com'},
          roles: [UserRole.User],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error when user lacks permission for ${OPERATION_NAMES.DELETE_USER_BY_EMAIL} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_EMAIL,
          args: {input: {userId: 'user@example.com'}},
          roles: [UserRole.Guest],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error for user with inccorrect role ${OPERATION_NAMES.DELETE_USER_BY_EMAIL} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_USERNAME,
          args: {username: 'username'},
          roles: [UserRole.User],
          expectAuthorized: true,
          testDescription: `should AUTHORIZE a user with the correct role and permission for ${OPERATION_NAMES.DELETE_USER_BY_USERNAME} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_USERNAME,
          args: {username: 'another-username'},
          roles: [UserRole.User],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error when user lacks permission for ${OPERATION_NAMES.DELETE_USER_BY_USERNAME} on item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_USERNAME,
          args: {input: {username: 'username'}},
          roles: [UserRole.Guest],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error for user with inccorrect role ${OPERATION_NAMES.DELETE_USER_BY_USERNAME} on item`,
        },
        {
          operationName: OPERATION_NAMES.UPDATE_EVENT,
          args: {eventId: 'event-id'},
          roles: [UserRole.User],
          expectAuthorized: true,
          mockDAO: true,
          eventDAOResult: [{userId: 'current-user-id'}],
          testDescription: `should AUTHORIZE a user with the correct role and permission for ${OPERATION_NAMES.UPDATE_EVENT} on item`,
        },
        {
          operationName: OPERATION_NAMES.UPDATE_EVENT,
          args: {eventId: 'event-id'},
          roles: [UserRole.User],
          expectAuthorized: false,
          mockDAO: true,
          eventDAOResult: [{userId: 'another-id'}],
          testDescription: `should throw UNAUTHORIZED Error when user lacks permission for ${OPERATION_NAMES.UPDATE_EVENT} on item`,
        },
        {
          operationName: OPERATION_NAMES.UPDATE_EVENT,
          args: {input: {eventId: 'event-id', title: 'updated event title'}},
          roles: [UserRole.Guest],
          expectAuthorized: false,
          testDescription: `should throw UNAUTHORIZED Error for user with inccorrect role ${OPERATION_NAMES.UPDATE_EVENT} on item`,
        },
        {
          operationName: OPERATION_NAMES.CREATE_EVENT,
          args: {title: 'updated event title'},
          roles: [UserRole.User],
          expectAuthorized: true,
          testDescription: `should AUTHORIZE a user with the correct role for ${OPERATION_NAMES.UPDATE_EVENT} on item`,
        },
      ];

      testCases.forEach(({operationName, args, roles, expectAuthorized, mockDAO, eventDAOResult, testDescription}) => {
        it(testDescription, async () => {
          const mockResolveInfo: GraphQLResolveInfo = {fieldName: operationName} as any;

          if (mockDAO) {
            (EventDAO.readEventById as jest.Mock).mockResolvedValue({organizerList: eventDAOResult});
          }
          if (expectAuthorized) {
            const result = await authChecker({context: mockContext, args: args, info: mockResolveInfo, root}, roles);
            expect(result).toBe(true);
          } else {
            await expect(authChecker({context: mockContext, args: args, info: mockResolveInfo, root}, roles)).rejects.toThrow(
              CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED),
            );
          }
        });
      });

      // Reason to deny is user is, if an operation is not protected, our codebase should not even invoke the authChecker
      it('should DENY a user when calling a non-protected operation', async () => {
        const mockResolveInfo: GraphQLResolveInfo = {fieldName: 'non-protected'} as any;

        await expect(authChecker({context: mockContext, info: mockResolveInfo, args: {}, root}, [UserRole.User])).rejects.toThrow(
          CustomError(ERROR_MESSAGES.UNAUTHORIZED, ErrorTypes.UNAUTHORIZED),
        );
      });
    });

    describe('Admin permissions', () => {
      beforeEach(() => {
        (verify as jest.Mock).mockReturnValue({...mockAdminUser, id: 'current-user-id', iat: 123, exp: 456});
      });

      const testCases = [
        {
          operationName: OPERATION_NAMES.UPDATE_USER,
          args: {input: {id: 'another-id'}},
          roles: [UserRole.Admin],
          testDescription: `should AUTHORIZE Admin user for ${OPERATION_NAMES.UPDATE_USER} on any item`,
        },
        {
          operationName: OPERATION_NAMES.DELETE_USER_BY_ID,
          args: {id: 'another-id'},
          roles: [UserRole.Admin],
          testDescription: `should AUTHORIZE Admin user for ${OPERATION_NAMES.DELETE_USER_BY_ID} on any item`,
        },
        {
          operationName: OPERATION_NAMES.UPDATE_EVENT,
          args: {eventId: 'event-id'},
          roles: [UserRole.Admin],
          testDescription: `should AUTHORIZE Admin user for ${OPERATION_NAMES.UPDATE_EVENT} on any item`,
        },
        {
          operationName: OPERATION_NAMES.CREATE_EVENT,
          args: {},
          roles: [UserRole.Admin],
          testDescription: `should AUTHORIZE Admin user for ${OPERATION_NAMES.CREATE_EVENT} on any item`,
        },
      ];

      testCases.forEach(({operationName, args, roles, testDescription}) => {
        it(testDescription, async () => {
          const mockResolveInfo: GraphQLResolveInfo = {fieldName: operationName} as any;

          const result = await authChecker({context: mockContext, args: args, info: mockResolveInfo, root}, roles);
          expect(result).toBe(true);
        });
      });
    });

    describe('invalid token', () => {
      const root = null;

      it('should throw UNAUTHENTICATED Error for a user WITHOUT a token', async () => {
        const mockResolveInfo = {fieldName: OPERATION_NAMES.CREATE_EVENT} as GraphQLResolveInfo;
        const mockContext: ServerContext = {token: undefined};
        const args: ArgsDictionary = {input: {title: 'mock event title'}};

        await expect(authChecker({context: mockContext, info: mockResolveInfo, args, root}, [UserRole.User])).rejects.toThrow(
          CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED),
        );
      });

      it('should throw UNAUTHENTICATED Error for a user with INVALID token', async () => {
        (verify as jest.Mock).mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const mockResolveInfo = {fieldName: OPERATION_NAMES.CREATE_EVENT} as GraphQLResolveInfo;
        const mockContext: ServerContext = {token: 'invalid-token'};
        const args: ArgsDictionary = {input: {title: 'mock event title'}};

        await expect(authChecker({context: mockContext, info: mockResolveInfo, args, root}, [UserRole.User])).rejects.toThrow(
          CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED),
        );
      });

      it('should throw UNAUTHENTICATED Error for a user with EXPIRED token', async () => {
        (verify as jest.Mock).mockImplementation(() => {
          throw new Error('TokenExpiredError');
        });

        const mockResolveInfo = {fieldName: OPERATION_NAMES.CREATE_EVENT} as GraphQLResolveInfo;
        const mockContext: ServerContext = {token: 'expired-token'};
        const args: ArgsDictionary = {input: {title: 'mock event title'}};

        await expect(authChecker({context: mockContext, info: mockResolveInfo, args, root}, [UserRole.User])).rejects.toThrow(
          CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED),
        );
      });
    });
  });
});
