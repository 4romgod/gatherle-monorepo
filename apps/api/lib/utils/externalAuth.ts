import { APPLE_CLIENT_ID, GOOGLE_CLIENT_ID } from '@/constants';
import type { ExchangeOAuthInput } from '@gatherle/commons/types';
import { AuthProvider } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from './exceptions';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const APPLE_ISSUER = 'https://appleid.apple.com';

export type VerifiedExternalIdentity = {
  provider: AuthProvider.Google | AuthProvider.Apple;
  providerUserId: string;
  email?: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  profilePicture?: string;
};

const asOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const asOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
  }

  return undefined;
};

const requireAudience = (provider: AuthProvider.Google | AuthProvider.Apple): string => {
  const audience = provider === AuthProvider.Google ? GOOGLE_CLIENT_ID : APPLE_CLIENT_ID;
  if (!audience) {
    throw CustomError(`${provider} sign-in is not configured.`, ErrorTypes.INTERNAL_SERVER_ERROR);
  }
  return audience;
};

const verifyGoogleIdentityToken = async (input: ExchangeOAuthInput): Promise<VerifiedExternalIdentity> => {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  const audience = requireAudience(AuthProvider.Google);
  const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  const { payload } = await jwtVerify(input.idToken, googleJwks, {
    audience,
    issuer: GOOGLE_ISSUERS,
  });

  const providerUserId = asOptionalString(payload.sub);
  if (!providerUserId) {
    throw CustomError('Google identity token is invalid.', ErrorTypes.UNAUTHENTICATED);
  }

  return {
    provider: AuthProvider.Google,
    providerUserId,
    email: asOptionalString(payload.email) ?? input.email,
    emailVerified: asOptionalBoolean(payload.email_verified) ?? false,
    givenName: asOptionalString(payload.given_name) ?? input.given_name,
    familyName: asOptionalString(payload.family_name) ?? input.family_name,
    profilePicture: asOptionalString(payload.picture) ?? input.profile_picture,
  };
};

const verifyAppleIdentityToken = async (input: ExchangeOAuthInput): Promise<VerifiedExternalIdentity> => {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  const audience = requireAudience(AuthProvider.Apple);
  const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  const { payload } = await jwtVerify(input.idToken, appleJwks, {
    audience,
    issuer: APPLE_ISSUER,
  });

  const providerUserId = asOptionalString(payload.sub);
  if (!providerUserId) {
    throw CustomError('Apple identity token is invalid.', ErrorTypes.UNAUTHENTICATED);
  }

  return {
    provider: AuthProvider.Apple,
    providerUserId,
    email: asOptionalString(payload.email) ?? input.email,
    emailVerified: asOptionalBoolean(payload.email_verified) ?? false,
    givenName: input.given_name,
    familyName: input.family_name,
    profilePicture: input.profile_picture,
  };
};

export const verifyExternalIdentityToken = async (input: ExchangeOAuthInput): Promise<VerifiedExternalIdentity> => {
  switch (input.provider) {
    case AuthProvider.Google:
      return verifyGoogleIdentityToken(input);
    case AuthProvider.Apple:
      return verifyAppleIdentityToken(input);
    default:
      throw CustomError('Unsupported authentication provider.', ErrorTypes.BAD_USER_INPUT);
  }
};
