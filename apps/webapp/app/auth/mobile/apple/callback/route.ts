const APPLE_MOBILE_DEEP_LINK = 'gatherle://auth/apple';

type AppleUserPayload = {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
};

type CallbackParamsSource = FormData | URLSearchParams;

function asOptionalString(value: FormDataEntryValue | string | null): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseAppleUserPayload(userPayload: string | undefined): AppleUserPayload | null {
  if (!userPayload) {
    return null;
  }

  try {
    return JSON.parse(userPayload) as AppleUserPayload;
  } catch {
    return null;
  }
}

function readString(source: CallbackParamsSource, key: string): string | undefined {
  return asOptionalString(source.get(key));
}

function buildAppRedirectUrl(source: CallbackParamsSource): string {
  const redirectUrl = new URL(APPLE_MOBILE_DEEP_LINK);
  const userPayload = parseAppleUserPayload(readString(source, 'user'));
  const forwardedParams: Record<string, string | undefined> = {
    code: readString(source, 'code'),
    email: readString(source, 'email') ?? asOptionalString(userPayload?.email ?? null),
    error: readString(source, 'error'),
    error_description: readString(source, 'error_description'),
    family_name: readString(source, 'family_name') ?? asOptionalString(userPayload?.name?.lastName ?? null),
    given_name: readString(source, 'given_name') ?? asOptionalString(userPayload?.name?.firstName ?? null),
    id_token: readString(source, 'id_token'),
    state: readString(source, 'state'),
  };

  for (const [key, value] of Object.entries(forwardedParams)) {
    if (value) {
      redirectUrl.searchParams.set(key, value);
    }
  }

  return redirectUrl.toString();
}

function buildRedirectHtml(appRedirectUrl: string) {
  const escapedRedirectUrl = appRedirectUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${escapedRedirectUrl}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to Gatherle</title>
  </head>
  <body>
    <script>
      window.location.replace(${JSON.stringify(appRedirectUrl)});
    </script>
    <p>Returning to Gatherle...</p>
    <p><a href="${escapedRedirectUrl}">Tap here if the app does not open automatically.</a></p>
  </body>
</html>`;
}

function buildRedirectResponse(source: CallbackParamsSource): Response {
  const appRedirectUrl = buildAppRedirectUrl(source);

  return new Response(buildRedirectHtml(appRedirectUrl), {
    headers: {
      'cache-control': 'no-store, max-age=0',
      'content-type': 'text/html; charset=utf-8',
    },
    status: 200,
  });
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  return buildRedirectResponse(requestUrl.searchParams);
}

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  return buildRedirectResponse(formData);
}

export const runtime = 'nodejs';
