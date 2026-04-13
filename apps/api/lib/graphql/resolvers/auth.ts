import 'reflect-metadata';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { UserDAO, EmailVerificationTokenDAO, PasswordResetTokenDAO } from '@/mongodb/dao';
import { ExchangeOAuthInput, User, UserWithToken } from '@gatherle/commons/types';
import { validateEmail, validateInput } from '@/validation';
import { RESOLVER_DESCRIPTIONS } from '@/constants';
import { CustomError, ErrorTypes } from '@/utils/exceptions';
import { logger } from '@/utils/logger';
import { EmailService } from '@/services';
import { ExchangeOAuthInputSchema } from '@/validation/zod';
import { verifyExternalIdentityToken } from '@/utils';

@Resolver()
export class AuthResolver {
  @Mutation(() => Boolean, { description: RESOLVER_DESCRIPTIONS.USER.requestEmailVerification })
  async requestEmailVerification(@Arg('email', () => String) email: string): Promise<boolean> {
    validateEmail(email);

    let user;
    try {
      user = await UserDAO.readUserByEmail(email);
    } catch (error) {
      const code = (error as { extensions?: { code?: string } })?.extensions?.code;
      if (code !== ErrorTypes.NOT_FOUND.errorCode) {
        logger.error('[AuthResolver] Unexpected error in requestEmailVerification', { error });
        throw error;
      }
      // Email not registered — silently succeed to avoid leaking registered addresses
      return true;
    }

    if (user.emailVerified) {
      return true;
    }

    const plainToken = await EmailVerificationTokenDAO.create(user.userId);
    await EmailService.sendEmailVerification(email, plainToken);
    return true;
  }

  @Mutation(() => User, { description: RESOLVER_DESCRIPTIONS.USER.verifyEmail })
  async verifyEmail(@Arg('token', () => String) token: string): Promise<User> {
    if (!token || !token.trim()) {
      throw CustomError('Verification token is required.', ErrorTypes.BAD_USER_INPUT);
    }

    const userId = await EmailVerificationTokenDAO.verify(token);
    const user = await UserDAO.setEmailVerified(userId);

    // Best-effort cleanup — a failure here must not undo or mask a successful verification
    void EmailVerificationTokenDAO.deleteByUserId(userId).catch((err) =>
      logger.warn('[AuthResolver] Failed to clean up email verification token', { userId, error: err }),
    );

    return user;
  }

  @Mutation(() => Boolean, { description: 'Send a password reset link to the given email address' })
  async forgotPassword(@Arg('email', () => String) email: string): Promise<boolean> {
    validateEmail(email);

    let user;
    try {
      user = await UserDAO.readUserByEmail(email);
    } catch (error) {
      const code = (error as { extensions?: { code?: string } })?.extensions?.code;
      if (code !== ErrorTypes.NOT_FOUND.errorCode) {
        logger.error('[AuthResolver] Unexpected error in forgotPassword', { error });
        throw error;
      }
      // Email not registered — silently succeed to avoid leaking registered addresses
      return true;
    }

    const plainToken = await PasswordResetTokenDAO.create(user.userId);
    await EmailService.sendPasswordReset(email, plainToken);
    return true;
  }

  @Mutation(() => Boolean, { description: "Reset a user's password using a valid reset token" })
  async resetPassword(
    @Arg('token', () => String) token: string,
    @Arg('newPassword', () => String) newPassword: string,
  ): Promise<boolean> {
    if (!token || !token.trim()) {
      throw CustomError('Reset token is required.', ErrorTypes.BAD_USER_INPUT);
    }
    if (!newPassword || newPassword.length < 8) {
      throw CustomError('Password must be at least 8 characters.', ErrorTypes.BAD_USER_INPUT);
    }

    const userId = await PasswordResetTokenDAO.verify(token);
    await UserDAO.updatePassword(userId, newPassword);

    // Best-effort cleanup — a failure here must not undo or mask a successful password reset
    void PasswordResetTokenDAO.deleteByUserId(userId).catch((err) =>
      logger.warn('[AuthResolver] Failed to clean up password reset token', { userId, error: err }),
    );

    return true;
  }

  @Mutation(() => UserWithToken, {
    description: 'Exchange a verified Google or Apple identity token for a Gatherle session',
  })
  async loginWithOAuth(@Arg('input', () => ExchangeOAuthInput) input: ExchangeOAuthInput): Promise<UserWithToken> {
    validateInput<ExchangeOAuthInput>(ExchangeOAuthInputSchema, input);
    const verifiedIdentity = await verifyExternalIdentityToken(input);
    return UserDAO.loginWithOAuth(verifiedIdentity);
  }
}
