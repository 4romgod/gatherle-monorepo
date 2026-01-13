import 'reflect-metadata';
import type {DocumentType} from '@typegoose/typegoose';
import {getModelForClass, pre} from '@typegoose/typegoose';
import {User as UserEntity} from '@ntlango/commons/types';
import {genSalt, hash, compare} from 'bcryptjs';
import {logger} from '@/utils/logger';

async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await genSalt(10);
  return hash(plainPassword, salt);
}

type UpdateFields = {
  password?: string;
  email?: string;
  [key: string]: unknown;
};

@pre<UserModel>('validate', async function (next) {
  try {
    if (!this.userId && this._id) {
      this.userId = this._id.toString();
    }

    if (this.email && !this.username) {
      const baseUsername = this.email.split('@')[0];

      for (let usernameSuffix = 1; ; usernameSuffix++) {
        const candidateUsername = usernameSuffix === 1 ? baseUsername : `${baseUsername}${usernameSuffix}`;
        const existingUser = await User.findOne({username: candidateUsername});
        if (!existingUser) {
          this.username = candidateUsername;
          break;
        }
      }
    }

    if (this.isModified('password')) {
      this.password = await hashPassword(this.password);
    }
    if (this.isModified('email')) {
      this.email = this.email.toLowerCase();
    }
    next();
  } catch (err) {
    logger.debug('Error when pre-saving the user', err);
    next(err as Error);
  }
})
@pre<UserModel>(['findOneAndUpdate', 'updateOne'], async function (next) {
  try {
    type UpdateContext = {
      getUpdate?: () => unknown;
      setUpdate?: (update: UpdateFields) => void;
    };
    const context = this as UpdateContext;
    const update = context.getUpdate?.();

    if (!update || typeof update !== 'object' || Array.isArray(update)) {
      return next();
    }

    const updateObj = {...(update as Record<string, unknown>)} as UpdateFields;

    if (typeof updateObj.password === 'string') {
      updateObj.password = await hashPassword(updateObj.password);
    }

    if (typeof updateObj.email === 'string') {
      updateObj.email = updateObj.email.toLowerCase();
    }
    context.setUpdate?.(updateObj);
    next();
  } catch (err) {
    logger.error('Error in pre-update hook', err);
    next(err as Error);
  }
})
class UserModel extends UserEntity {
  comparePassword(candidatePassword: string) {
    return compare(candidatePassword, this.password);
  }
}

export type UserDocument = DocumentType<UserModel>;

const User = getModelForClass(UserModel, {
  options: {customName: 'User'},
  schemaOptions: {
    // TODO ensure default select behavior stays in sync with commons definition
    toObject: {getters: true},
    toJSON: {getters: true},
  },
});

export default User;
