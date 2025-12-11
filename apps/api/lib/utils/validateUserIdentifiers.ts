import {CancelRsvpInput, RsvpInput} from '@ntlango/commons/types';
import {User} from '@/mongodb/models';
import {CustomError, ErrorTypes} from './exceptions';
import {ERROR_MESSAGES} from '@/validation';

export const validateUserIdentifiers = async (input: RsvpInput | CancelRsvpInput): Promise<string[]> => {
  const {userIdList, emailList, usernameList} = input;

  try {
    const validUserIds = new Set<string>();

    if (userIdList && userIdList.length > 0) {
      const usersById = await User.find({userId: {$in: userIdList}}, {userId: 1});
      usersById.forEach(({userId}) => validUserIds.add(userId));
    }

    if (usernameList && usernameList.length > 0) {
      const usersByUsername = await User.find({username: {$in: usernameList}}, {userId: 1});
      usersByUsername.forEach(({userId}) => validUserIds.add(userId));
    }

    if (emailList && emailList.length > 0) {
      const usersByEmail = await User.find({email: {$in: emailList}}, {userId: 1});
      usersByEmail.forEach(({userId}) => validUserIds.add(userId));
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
