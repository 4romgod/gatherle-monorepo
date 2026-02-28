/** @type {import('next').NextConfig} */

const isDevelopment = process.env.NODE_ENV !== 'production';

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

const buildContentSecurityPolicy = () => {
  const connectSources = new Set(["'self'"]);
  const graphqlOrigin = getOrigin(process.env.NEXT_PUBLIC_GRAPHQL_URL);
  const websocketOrigin = getOrigin(process.env.NEXT_PUBLIC_WEBSOCKET_URL);

  if (graphqlOrigin) {
    connectSources.add(graphqlOrigin);
  }

  if (websocketOrigin) {
    connectSources.add(websocketOrigin);
  }

  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${Array.from(connectSources).join(' ')}`,
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
  allowedDevOrigins: ['*'],
};

export default nextConfig;
