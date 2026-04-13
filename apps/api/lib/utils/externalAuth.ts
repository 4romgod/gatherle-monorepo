import { APPLE_CLIENT_ID, GOOGLE_CLIENT_ID } from '@/constants';
import type { ExchangeOAuthInput } from '@gatherle/commons/types';
import { OAuthProvider } from '@gatherle/commons/types';
import { CustomError, ErrorTypes } from './exceptions';
import { logger } from './logger';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const APPLE_ISSUER = 'https://appleid.apple.com';

export type VerifiedExternalIdentity = {
  provider: OAuthProvider;
  providerUserId: string;
  email?: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  profilePicture?: string;
};

type JwtPayload = Record<string, unknown>;
type RemoteJwkSet = unknown;
type JoseModule = {
  createRemoteJWKSet: (url: URL) => RemoteJwkSet;
  jwtVerify: (
    token: string,
    jwks: RemoteJwkSet,
    options: { audience: string; issuer: string | string[] },
  ) => Promise<{ payload: JwtPayload }>;
};

let joseModulePromise: Promise<JoseModule> | undefined;
let googleJwksPromise: Promise<RemoteJwkSet> | undefined;
let appleJwksPromise: Promise<RemoteJwkSet> | undefined;

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

const getJoseModule = (): Promise<JoseModule> => {
  joseModulePromise ??= import('jose') as Promise<JoseModule>;
  return joseModulePromise;
};

const getGoogleJwks = (): Promise<RemoteJwkSet> => {
  googleJwksPromise ??= getJoseModule().then(({ createRemoteJWKSet }) =>
    createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),
  );
  return googleJwksPromise;
};

const getAppleJwks = (): Promise<RemoteJwkSet> => {
  appleJwksPromise ??= getJoseModule().then(({ createRemoteJWKSet }) =>
    createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys')),
  );
  return appleJwksPromise;
};

const requireAudience = (provider: OAuthProvider): string => {
  const audience = provider === OAuthProvider.Google ? GOOGLE_CLIENT_ID : APPLE_CLIENT_ID;
  if (!audience) {
    throw CustomError(`${provider} sign-in is not configured.`, ErrorTypes.INTERNAL_SERVER_ERROR);
  }
  return audience;
};

const verifyIdentityToken = async ({
  provider,
  idToken,
  audience,
  issuer,
  getJwks,
}: {
  provider: OAuthProvider;
  idToken: string;
  audience: string;
  issuer: string | string[];
  getJwks: () => Promise<RemoteJwkSet>;
}): Promise<JwtPayload> => {
  try {
    const [{ jwtVerify }, jwks] = await Promise.all([getJoseModule(), getJwks()]);
    const { payload } = await jwtVerify(idToken, jwks, { audience, issuer });
    return payload;
  } catch (error) {
    logger.warn('External identity token verification failed', {
      provider,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : undefined,
    });
    throw CustomError(`${provider} identity token is invalid.`, ErrorTypes.UNAUTHENTICATED);
  }
};

const verifyGoogleIdentityToken = async (input: ExchangeOAuthInput): Promise<VerifiedExternalIdentity> => {
  const audience = requireAudience(OAuthProvider.Google);
  const payload = await verifyIdentityToken({
    provider: OAuthProvider.Google,
    idToken: input.idToken,
    audience,
    issuer: GOOGLE_ISSUERS,
    getJwks: getGoogleJwks,
  });

  const providerUserId = asOptionalString(payload.sub);
  if (!providerUserId) {
    throw CustomError(`${OAuthProvider.Google} identity token is invalid.`, ErrorTypes.UNAUTHENTICATED);
  }

  return {
    provider: OAuthProvider.Google,
    providerUserId,
    email: asOptionalString(payload.email) ?? input.email,
    emailVerified: asOptionalBoolean(payload.email_verified) ?? false,
    givenName: asOptionalString(payload.given_name) ?? input.given_name,
    familyName: asOptionalString(payload.family_name) ?? input.family_name,
    profilePicture: asOptionalString(payload.picture) ?? input.profile_picture,
  };
};

const verifyAppleIdentityToken = async (input: ExchangeOAuthInput): Promise<VerifiedExternalIdentity> => {
  const audience = requireAudience(OAuthProvider.Apple);
  const payload = await verifyIdentityToken({
    provider: OAuthProvider.Apple,
    idToken: input.idToken,
    audience,
    issuer: APPLE_ISSUER,
    getJwks: getAppleJwks,
  });

  const providerUserId = asOptionalString(payload.sub);
  if (!providerUserId) {
    throw CustomError(`${OAuthProvider.Apple} identity token is invalid.`, ErrorTypes.UNAUTHENTICATED);
  }

  return {
    provider: OAuthProvider.Apple,
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
    case OAuthProvider.Google:
      return verifyGoogleIdentityToken(input);
    case OAuthProvider.Apple:
      return verifyAppleIdentityToken(input);
    default:
      throw CustomError('Unsupported authentication provider.', ErrorTypes.BAD_USER_INPUT);
  }
};
