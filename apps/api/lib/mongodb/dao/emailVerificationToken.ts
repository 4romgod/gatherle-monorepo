import { genSalt, hash, compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { EmailVerificationToken as EmailVerificationTokenModel } from '@/mongodb/models';
import { CustomError, ErrorTypes, KnownCommonError, logDaoError } from '@/utils';
import { logger } from '@/utils/logger';

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Separator used to join/split the composite token.
 * Hex strings (0-9a-f) never contain this character, so splitting on the first
 * occurrence is unambiguous and the token is safe to embed in a URL query string.
 */
const COMPOSITE_SEP = '.';

class EmailVerificationTokenDAO {
  /**
   * Generate a composite token `${_id}.${secret}`, store a bcrypt hash of the secret,
   * and return the composite token.
   *
   * Embedding the document _id allows O(1) indexed lookup during verification,
   * avoiding a full collection scan and N bcrypt comparisons.
   */
  static async create(userId: string): Promise<string> {
    try {
      logger.debug(`[EmailVerificationTokenDAO] Creating token for userId ${userId}`);
      // Remove any existing tokens for this user first
      await EmailVerificationTokenModel.deleteMany({ userId });

      const secret = randomBytes(32).toString('hex');
      const salt = await genSalt(10);
      const tokenHash = await hash(secret, salt);
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      const doc = await EmailVerificationTokenModel.create({ userId, tokenHash, expiresAt });
      logger.debug(`[EmailVerificationTokenDAO] Token created for userId ${userId}`);
      return `${doc._id.toString()}${COMPOSITE_SEP}${secret}`;
    } catch (error) {
      logDaoError('Error creating email verification token', { error });
      throw KnownCommonError(error);
    }
  }

  /**
   * Verify a composite token (`${_id}.${secret}`) issued by `create`.
   * Looks up the document by _id (O(1) indexed), then bcrypt-compares only that
   * document's hash, eliminating the previous O(N) full-scan + comparison loop.
   * Returns the userId if valid, throws otherwise.
   */
  static async verify(compositeToken: string): Promise<string> {
    const sepIdx = compositeToken.indexOf(COMPOSITE_SEP);
    if (sepIdx === -1) {
      throw CustomError('Verification token is invalid or has expired.', ErrorTypes.BAD_USER_INPUT);
    }
    const tokenId = compositeToken.slice(0, sepIdx);
    const secret = compositeToken.slice(sepIdx + 1);

    let tokenDoc;
    try {
      tokenDoc = await EmailVerificationTokenModel.findOne({
        _id: tokenId,
        expiresAt: { $gt: new Date() },
      }).lean();
    } catch (error) {
      logDaoError('Error verifying email verification token', { error });
      throw KnownCommonError(error);
    }

    if (!tokenDoc) {
      throw CustomError('Verification token is invalid or has expired.', ErrorTypes.BAD_USER_INPUT);
    }

    const isMatch = await compare(secret, tokenDoc.tokenHash);
    if (!isMatch) {
      throw CustomError('Verification token is invalid or has expired.', ErrorTypes.BAD_USER_INPUT);
    }

    return tokenDoc.userId;
  }

  /**
   * Delete all tokens belonging to a userId (called after successful verification).
   */
  static async deleteByUserId(userId: string): Promise<void> {
    try {
      await EmailVerificationTokenModel.deleteMany({ userId });
    } catch (error) {
      logDaoError(`Error deleting email verification tokens for userId ${userId}`, { error });
      throw KnownCommonError(error);
    }
  }
}

export default EmailVerificationTokenDAO;
