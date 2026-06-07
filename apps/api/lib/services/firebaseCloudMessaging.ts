import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import jwt from 'jsonwebtoken';
import { getConfigValue } from '@/clients/AWS/secretsManager';
import { SECRET_KEYS } from '@/constants';
import { logger } from '@/utils/logger';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIREBASE_MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

export type FirebasePushDelivery = {
  actionUrl: string;
  body: string;
  channelId: string;
  notificationId: string;
  title: string;
  token: string;
  userId: string;
};

type GoogleAccessTokenPayload = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
};

type FirebaseErrorResponse = {
  error?: {
    details?: Array<Record<string, unknown>>;
    message?: string;
    status?: string;
  };
};

type CachedGoogleAccessToken = {
  accessToken: string;
  cacheKey: string;
  expiresAt: number;
};

type FirebaseServiceAccountSource = {
  cacheKey: string;
  rawJson: string;
};

type FirebasePushDeliveryResult = {
  deliveredNotificationIds: string[];
  deliveredTokens: string[];
  staleTokens: string[];
};

let cachedGoogleAccessToken: CachedGoogleAccessToken | null = null;

function normalizeServiceAccountJson(rawValue: unknown): string | null {
  if (typeof rawValue === 'string') {
    const trimmedValue = rawValue.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  if (rawValue && typeof rawValue === 'object') {
    return JSON.stringify(rawValue);
  }

  return null;
}

function resolveConfiguredServiceAccountPaths(configuredPath: string): string[] {
  if (isAbsolute(configuredPath)) {
    return [configuredPath];
  }

  return [...new Set([resolve(process.cwd(), configuredPath), resolve(__dirname, '../../', configuredPath)])];
}

async function readServiceAccountSource(): Promise<FirebaseServiceAccountSource | null> {
  const inlineJson = normalizeServiceAccountJson(process.env.FIREBASE_FCM_SERVICE_ACCOUNT_JSON);
  if (inlineJson) {
    return {
      cacheKey: `inline:${createHash('sha256').update(inlineJson).digest('hex')}`,
      rawJson: inlineJson,
    };
  }

  const configuredPath = process.env.FIREBASE_FCM_SERVICE_ACCOUNT_PATH?.trim();
  if (configuredPath) {
    const resolvedPaths = resolveConfiguredServiceAccountPaths(configuredPath);

    for (const resolvedPath of resolvedPaths) {
      try {
        return {
          cacheKey: `path:${resolvedPath}`,
          rawJson: fs.readFileSync(resolvedPath, 'utf8'),
        };
      } catch {
        continue;
      }
    }

    logger.warn('Firebase FCM service account file could not be read', {
      configuredPath,
      attemptedPaths: resolvedPaths,
    });
  }

  try {
    const secretJson = normalizeServiceAccountJson(await getConfigValue(SECRET_KEYS.FIREBASE_FCM_SERVICE_ACCOUNT_JSON));
    if (!secretJson) {
      throw new Error('Firebase FCM service account JSON secret is empty');
    }

    return {
      cacheKey: `secret:${createHash('sha256').update(secretJson).digest('hex')}`,
      rawJson: secretJson,
    };
  } catch (error) {
    logger.warn('Firebase FCM service account JSON is not configured', { error });
    return null;
  }
}

async function loadServiceAccount(): Promise<{ cacheKey: string; serviceAccount: FirebaseServiceAccount } | null> {
  const source = await readServiceAccountSource();
  if (!source) {
    return null;
  }

  try {
    const parsed = JSON.parse(source.rawJson) as Partial<FirebaseServiceAccount>;
    if (
      typeof parsed.client_email !== 'string' ||
      parsed.client_email.trim().length === 0 ||
      typeof parsed.private_key !== 'string' ||
      parsed.private_key.trim().length === 0 ||
      typeof parsed.project_id !== 'string' ||
      parsed.project_id.trim().length === 0
    ) {
      logger.warn('Firebase FCM service account JSON is missing required fields');
      return null;
    }

    return {
      cacheKey: source.cacheKey,
      serviceAccount: {
        client_email: parsed.client_email.trim(),
        private_key: parsed.private_key,
        project_id: parsed.project_id.trim(),
        token_uri:
          typeof parsed.token_uri === 'string' && parsed.token_uri.trim().length > 0
            ? parsed.token_uri.trim()
            : GOOGLE_OAUTH_TOKEN_URL,
      },
    };
  } catch (error) {
    logger.warn('Firebase FCM service account JSON could not be parsed', { error });
    return null;
  }
}

async function getGoogleAccessToken(serviceAccount: FirebaseServiceAccount, cacheKey: string): Promise<string | null> {
  if (
    cachedGoogleAccessToken &&
    cachedGoogleAccessToken.cacheKey === cacheKey &&
    cachedGoogleAccessToken.expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS
  ) {
    return cachedGoogleAccessToken.accessToken;
  }

  try {
    const assertion = jwt.sign(
      {
        scope: FIREBASE_MESSAGING_SCOPE,
      },
      serviceAccount.private_key,
      {
        algorithm: 'RS256',
        audience: serviceAccount.token_uri ?? GOOGLE_OAUTH_TOKEN_URL,
        expiresIn: '1h',
        issuer: serviceAccount.client_email,
        subject: serviceAccount.client_email,
      },
    );

    const response = await fetch(serviceAccount.token_uri ?? GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as GoogleAccessTokenPayload;
    if (!response.ok || typeof payload.access_token !== 'string' || typeof payload.expires_in !== 'number') {
      logger.warn('Firebase OAuth token exchange failed', {
        status: response.status,
        statusText: response.statusText,
        error: payload.error,
        errorDescription: payload.error_description,
      });
      return null;
    }

    cachedGoogleAccessToken = {
      accessToken: payload.access_token,
      cacheKey,
      expiresAt: Date.now() + payload.expires_in * 1000,
    };

    return payload.access_token;
  } catch (error) {
    logger.warn('Firebase OAuth token exchange failed before completion', { error });
    return null;
  }
}

function isUnregisteredFirebaseError(payload: FirebaseErrorResponse): boolean {
  if (payload.error?.status === 'UNREGISTERED') {
    return true;
  }

  return (payload.error?.details ?? []).some((detail) => detail?.['errorCode'] === 'UNREGISTERED');
}

export async function sendFirebasePushDeliveries(
  deliveries: FirebasePushDelivery[],
): Promise<FirebasePushDeliveryResult | null> {
  if (deliveries.length === 0) {
    return {
      deliveredNotificationIds: [],
      deliveredTokens: [],
      staleTokens: [],
    };
  }

  const loadedServiceAccount = await loadServiceAccount();
  if (!loadedServiceAccount) {
    logger.warn('Skipping Firebase push delivery because no service account is configured');
    return null;
  }

  const accessToken = await getGoogleAccessToken(loadedServiceAccount.serviceAccount, loadedServiceAccount.cacheKey);
  if (!accessToken) {
    return null;
  }

  logger.info('Dispatching Firebase push deliveries', {
    deliveryCount: deliveries.length,
    projectId: loadedServiceAccount.serviceAccount.project_id,
  });

  const deliveredNotificationIds = new Set<string>();
  const deliveredTokens = new Set<string>();
  const staleTokens = new Set<string>();
  const endpoint = `https://fcm.googleapis.com/v1/projects/${loadedServiceAccount.serviceAccount.project_id}/messages:send`;

  for (const delivery of deliveries) {
    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: delivery.token,
            notification: {
              title: delivery.title,
              body: delivery.body,
            },
            data: {
              actionUrl: delivery.actionUrl,
              notificationId: delivery.notificationId,
            },
            android: {
              priority: 'HIGH',
              notification: {
                channelId: delivery.channelId,
              },
            },
          },
        }),
      });
    } catch (error) {
      logger.warn('Firebase push request failed before a response was received', {
        notificationId: delivery.notificationId,
        token: delivery.token,
        userId: delivery.userId,
        error,
      });
      continue;
    }

    if (response.ok) {
      deliveredNotificationIds.add(delivery.notificationId);
      deliveredTokens.add(delivery.token);
      continue;
    }

    const payload = (await response.json().catch(() => ({}))) as FirebaseErrorResponse;
    if (isUnregisteredFirebaseError(payload)) {
      staleTokens.add(delivery.token);
    }

    logger.warn('Firebase push delivery failed', {
      notificationId: delivery.notificationId,
      token: delivery.token,
      userId: delivery.userId,
      status: response.status,
      statusText: response.statusText,
      errorStatus: payload.error?.status,
      errorMessage: payload.error?.message,
    });
  }

  logger.info('Firebase push deliveries finished', {
    deliveryCount: deliveries.length,
    deliveredNotificationCount: deliveredNotificationIds.size,
    deliveredTokenCount: deliveredTokens.size,
    staleTokenCount: staleTokens.size,
  });

  return {
    deliveredNotificationIds: [...deliveredNotificationIds],
    deliveredTokens: [...deliveredTokens],
    staleTokens: [...staleTokens],
  };
}
