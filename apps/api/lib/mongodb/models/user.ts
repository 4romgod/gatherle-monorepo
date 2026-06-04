import 'reflect-metadata';
import type { DocumentType } from '@typegoose/typegoose';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { User as UserEntity } from '@gatherle/commons/server/types';
import { genSalt, hash, compare } from 'bcryptjs';
import { logger } from '@/utils/logger';
import type { MongoModelForClass } from './modelTypes';

async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await genSalt(10);
  return hash(plainPassword, salt);
}

type UpdateFields = {
  password?: string;
  email?: string;
  [key: string]: unknown;
};

@pre<UserModel>('validate', async function () {
  try {
    if (!this.userId && this._id) {
      this.userId = this._id.toString();
    }

    if (this.email && !this.username) {
      const baseUsername = this.email.split('@')[0];

      for (let usernameSuffix = 1; ; usernameSuffix++) {
        const candidateUsername = usernameSuffix === 1 ? baseUsername : `${baseUsername}${usernameSuffix}`;
        const existingUser = await User.findOne({ username: candidateUsername });
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
  } catch (error) {
    logger.debug('Error when pre-saving the user', { error });
    throw error;
  }
})
@pre<UserModel>(['findOneAndUpdate', 'updateOne'], async function () {
  try {
    type UpdateContext = {
      getUpdate?: () => unknown;
      setUpdate?: (update: UpdateFields) => void;
    };
    const context = this as UpdateContext;
    const update = context.getUpdate?.();

    if (!update || typeof update !== 'object' || Array.isArray(update)) {
      return;
    }

    const updateObj = { ...(update as Record<string, unknown>) } as UpdateFields;

    if (typeof updateObj.password === 'string') {
      updateObj.password = await hashPassword(updateObj.password);
    }

    if (typeof updateObj.email === 'string') {
      updateObj.email = updateObj.email.toLowerCase();
    }
    context.setUpdate?.(updateObj);
  } catch (error) {
    logger.error('Error in pre-update hook', { error });
    throw error;
  }
})
class UserModel extends UserEntity {
  comparePassword(candidatePassword: string) {
    return compare(candidatePassword, this.password);
  }
}

export type UserDocument = DocumentType<UserModel>;

const User: MongoModelForClass<typeof UserModel> = getModelForClass(UserModel, {
  options: { customName: 'User' },
  schemaOptions: {
    toObject: { getters: true },
    toJSON: { getters: true },
  },
});

export default User;
