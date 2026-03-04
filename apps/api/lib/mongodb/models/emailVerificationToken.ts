import 'reflect-metadata';
import { getModelForClass, index } from '@typegoose/typegoose';
import { EmailVerificationToken as EmailVerificationTokenEntity } from '@gatherle/commons/types';

// Automatically expire documents 24 hours after creation (TTL index)
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
class EmailVerificationTokenModel extends EmailVerificationTokenEntity {}

export default getModelForClass(EmailVerificationTokenModel);
