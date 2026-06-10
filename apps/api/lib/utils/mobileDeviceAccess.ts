import type { IncomingHttpHeaders } from 'http';
import {
  GATHERLE_APP_VERSION_HEADER,
  GATHERLE_BUILD_VERSION_HEADER,
  GATHERLE_CLIENT_PLATFORM_HEADER,
  GATHERLE_CLIENT_PLATFORM_MOBILE,
  GATHERLE_DEVICE_INSTALLATION_ID_HEADER,
} from '@/constants';
import { MobileDeviceAccessDAO } from '@/mongodb/dao';
import type { MobileDeviceAccessStatus } from '@gatherle/commons/server/types';

type HeaderValue = string | string[] | undefined;
type HeaderBag = IncomingHttpHeaders | Record<string, string | undefined>;

export type MobileRequestAccessContext = {
  appVersion?: string;
  buildVersion?: string;
  clientPlatform: typeof GATHERLE_CLIENT_PLATFORM_MOBILE;
  deviceInstallationId?: string;
  status?: MobileDeviceAccessStatus;
};

function readHeaderValue(headers: HeaderBag, headerName: string): string | undefined {
  const directValue = headers[headerName] as HeaderValue;
  const fallbackValue = headers[headerName.toLowerCase()] as HeaderValue;
  const value = directValue ?? fallbackValue;
  const resolvedValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = resolvedValue?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

export async function resolveMobileRequestAccessContext(
  headers: HeaderBag,
): Promise<MobileRequestAccessContext | undefined> {
  const clientPlatform = readHeaderValue(headers, GATHERLE_CLIENT_PLATFORM_HEADER);

  if (clientPlatform !== GATHERLE_CLIENT_PLATFORM_MOBILE) {
    return undefined;
  }

  const deviceInstallationId = readHeaderValue(headers, GATHERLE_DEVICE_INSTALLATION_ID_HEADER);
  const deviceAccess = deviceInstallationId
    ? await MobileDeviceAccessDAO.readByDeviceInstallationId(deviceInstallationId)
    : null;

  return {
    appVersion: readHeaderValue(headers, GATHERLE_APP_VERSION_HEADER),
    buildVersion: readHeaderValue(headers, GATHERLE_BUILD_VERSION_HEADER),
    clientPlatform,
    deviceInstallationId,
    status: deviceAccess?.status,
  };
}
