import type { CancelRsvpInput, RsvpInput } from '@gatherle/commons/types';
import { User } from '@/mongodb/models';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import { ERROR_MESSAGES } from '@/validation';
import { validateUserIdentifiers } from '@/utils';

jest.mock('@/mongodb/models', () => ({
  User: {
    find: jest.fn(),
  },
}));

describe('validateUserIdentifiers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate user identifiers successfully', async () => {
    const input: RsvpInput = {
      eventId: 'event123',
      userIdList: ['user1'],
      usernameList: ['username1'],
      emailList: ['email1@example.com'],
    };

    (User.find as jest.Mock).mockResolvedValueOnce([{ userId: 'user1AsId' }]);
    (User.find as jest.Mock).mockResolvedValueOnce([{ userId: 'username1AsId' }]);
    (User.find as jest.Mock).mockResolvedValueOnce([{ userId: 'email1AsId' }]);

    const result = await validateUserIdentifiers(input);

    expect(User.find).toHaveBeenCalledWith({ userId: { $in: ['user1'] } }, { userId: 1 });
    expect(User.find).toHaveBeenCalledWith({ username: { $in: ['username1'] } }, { userId: 1 });
    expect(User.find).toHaveBeenCalledWith({ email: { $in: ['email1@example.com'] } }, { userId: 1 });

    expect(result).toEqual(['user1AsId', 'username1AsId', 'email1AsId']);
  });

  it('should throw error when no valid user identifiers found', async () => {
    const input: CancelRsvpInput = {
      eventId: 'event123',
      userIdList: [],
    };

    (User.find as jest.Mock).mockResolvedValueOnce([]);

    await expect(validateUserIdentifiers(input)).rejects.toThrow(
      CustomError(ERROR_MESSAGES.NOT_FOUND('Users', 'provided identifiers', ''), ErrorTypes.NOT_FOUND),
    );
  });
});
