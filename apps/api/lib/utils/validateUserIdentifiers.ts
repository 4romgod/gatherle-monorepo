import {CancelRSVPInputType, RSVPInputType} from '@/graphql/types';
import {User} from '@/mongodb/models';
import {ObjectId} from 'mongoose';
import {CustomError, ErrorTypes} from './exceptions';
import {ERROR_MESSAGES} from '@/validation';

export const validateUserIdentifiers = async (input: RSVPInputType | CancelRSVPInputType): Promise<string[]> => {
    const {userIdList, emailList, usernameList} = input;

    try {
        const validUserIds = new Set<string>();

        if (userIdList && userIdList.length > 0) {
            const usersById = await User.find({_id: {$in: userIdList}}, {_id: 1});
            usersById.forEach((user) => validUserIds.add((user._id as ObjectId).toString()));
        }

        if (usernameList && usernameList.length > 0) {
            const usersByUsername = await User.find({username: {$in: usernameList}}, {_id: 1});
            usersByUsername.forEach((user) => validUserIds.add((user._id as ObjectId).toString()));
        }

        if (emailList && emailList.length > 0) {
            const usersByEmail = await User.find({email: {$in: emailList}}, {_id: 1});
            usersByEmail.forEach((user) => validUserIds.add((user._id as ObjectId).toString()));
        }

        if (validUserIds.size === 0) {
            throw CustomError(ERROR_MESSAGES.NOT_FOUND('Users', 'provided identifiers', ''), ErrorTypes.NOT_FOUND);
        }

        return Array.from(validUserIds);
    } catch (error) {
        console.error('Error validating user IDs', error);
        throw error;
    }
};
