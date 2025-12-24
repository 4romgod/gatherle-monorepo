import {CustomError, ErrorTypes} from '@/utils/exceptions';
import {ERROR_MESSAGES} from '@/validation';
import {ServerContext} from '@/graphql';
import type {User} from '@ntlango/commons/types';
import {verifyToken} from '@/utils/auth';

export const requireAuthenticatedUser = async (context: ServerContext): Promise<User> => {
  if (!context?.token) {
    throw CustomError(ERROR_MESSAGES.UNAUTHENTICATED, ErrorTypes.UNAUTHENTICATED);
  }
  return verifyToken(context.token);
};
