import {CancelRSVPInputType, RSVPInputType} from '@/graphql/types';
import {User} from '@/mongodb/models';
import {ObjectId} from 'mongoose';
import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/validation';
import {validateUserIdentifiers} from '@/utils';

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
        const input: RSVPInputType = {
            eventId: 'event123',
            userIdList: ['user1'],
            usernameList: ['username1'],
            emailList: ['email1@example.com'],
        };

        (User.find as jest.Mock).mockResolvedValueOnce([{_id: 'user1AsId'}]);
        (User.find as jest.Mock).mockResolvedValueOnce([{_id: 'username1AsId'}]);
        (User.find as jest.Mock).mockResolvedValueOnce([{_id: 'email1AsId'}]);

        const result = await validateUserIdentifiers(input);

        expect(User.find).toHaveBeenCalledWith({_id: {$in: ['user1']}}, {_id: 1});
        expect(User.find).toHaveBeenCalledWith({username: {$in: ['username1']}}, {_id: 1});
        expect(User.find).toHaveBeenCalledWith({email: {$in: ['email1@example.com']}}, {_id: 1});

        expect(result).toEqual(['user1AsId', 'username1AsId', 'email1AsId']);
    });

    it('should throw error when no valid user identifiers found', async () => {
        const input: CancelRSVPInputType = {
            eventId: 'event123',
            userIdList: [],
        };

        (User.find as jest.Mock).mockResolvedValueOnce([]);

        await expect(validateUserIdentifiers(input)).rejects.toThrow(
            CustomError(ERROR_MESSAGES.NOT_FOUND('Users', 'provided identifiers', ''), ErrorTypes.NOT_FOUND),
        );
    });
});
