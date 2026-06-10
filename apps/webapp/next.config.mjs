/** @type {import('next').NextConfig} */

const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedDevOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const getOrigin = (value) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const normalizeWebSocketBaseUrl = (value) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}`;
  }

  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}`;
  }

  return trimmed;
};

const isLocalHostname = (hostname) => {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
  );
};

const resolveWebSocketOrigin = (explicitValue, graphQlValue) => {
  const normalizedExplicit = normalizeWebSocketBaseUrl(explicitValue);
  if (normalizedExplicit) {
    try {
      const explicitUrl = new URL(normalizedExplicit);
      const graphQlUrl = graphQlValue ? new URL(graphQlValue) : null;

      if (
        graphQlUrl?.protocol === 'https:' &&
        explicitUrl.protocol === 'ws:' &&
        !isLocalHostname(explicitUrl.hostname)
      ) {
        explicitUrl.protocol = 'wss:';
      }

      return explicitUrl.origin;
    } catch {
      return getOrigin(normalizedExplicit);
    }
  }

  if (!graphQlValue) {
    return null;
  }

  try {
    const parsedGraphQlUrl = new URL(graphQlValue);

    if (!isLocalHostname(parsedGraphQlUrl.hostname)) {
      // Keep this aligned with the shared resolver in packages/commons: only the
      // canonical `api.*` Gatherle GraphQL host can be safely rewritten to `ws.*`.
      // execute-api and other remote hosts must provide NEXT_PUBLIC_WEBSOCKET_URL.
      if (!parsedGraphQlUrl.hostname.startsWith('api.')) {
        return null;
      }

      const protocol = parsedGraphQlUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      return new URL(`${protocol}//ws.${parsedGraphQlUrl.hostname.slice('api.'.length)}`).origin;
    }

    const protocol = parsedGraphQlUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = parsedGraphQlUrl.port || (parsedGraphQlUrl.protocol === 'https:' ? '443' : '80');
    return new URL(`${protocol}//${parsedGraphQlUrl.hostname}:${port}/local`).origin;
  } catch {
    return null;
  }
};

const buildContentSecurityPolicy = () => {
  const connectSources = new Set(["'self'"]);
  const graphqlOrigin = getOrigin(process.env.NEXT_PUBLIC_GRAPHQL_URL);
  const websocketOrigin = resolveWebSocketOrigin(
    process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    process.env.NEXT_PUBLIC_GRAPHQL_URL,
  );
  const s3MediaOrigin = getOrigin(process.env.MEDIA_UPLOAD_S3_URL);
  const mediaCdnOrigin = getOrigin(process.env.NEXT_PUBLIC_MEDIA_CDN_URL);
  const mediaOrigins = Array.from(new Set([s3MediaOrigin, mediaCdnOrigin].filter(Boolean)));

  if (graphqlOrigin) {
    connectSources.add(graphqlOrigin);
  }

  if (websocketOrigin) {
    connectSources.add(websocketOrigin);
  }

  if (s3MediaOrigin) {
    connectSources.add(s3MediaOrigin);
  }

  // hls.js loads .m3u8 manifests and .ts segments via XHR — the CDN origin must
  // appear in connect-src for these requests to succeed. We keep both the CDN and
  // the direct S3 origin in media/connect-src so fallback playback still works if
  // a URL is served from either origin.
  mediaOrigins.forEach((origin) => {
    connectSources.add(origin);
  });

  const mediaSources = ["'self'", 'blob:'];
  mediaSources.push(...mediaOrigins);

  const imgSources = ["'self'", 'data:', 'blob:', 'https:'];

  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSources.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${Array.from(connectSources).join(' ')}`,
    `media-src ${mediaSources.join(' ')}`,
    "frame-src 'self' https://www.openstreetmap.org https://maps.google.com https://www.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
};

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: buildContentSecurityPolicy(),
  },
];

if (!isDevelopment) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000',
  });
}

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'random.imagecdn.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
  compiler: {
    styledComponents: true,
  },
  ...(isDevelopment ? { allowedDevOrigins } : {}),
};

export default nextConfig;
