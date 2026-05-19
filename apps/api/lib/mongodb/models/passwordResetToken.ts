import 'reflect-metadata';
import { getModelForClass, index } from '@typegoose/typegoose';
import { PasswordResetToken as PasswordResetTokenEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

// Automatically expire documents 1 hour after expiry date passes (TTL index)
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
class PasswordResetTokenModel extends PasswordResetTokenEntity {}

const PasswordResetToken: MongoModelForClass<typeof PasswordResetTokenModel> =
  getModelForClass(PasswordResetTokenModel);

export default PasswordResetToken;
