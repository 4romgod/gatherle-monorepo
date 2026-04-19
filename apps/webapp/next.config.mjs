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
  const s3MediaOrigin = getOrigin(process.env.NEXT_PUBLIC_S3_MEDIA_URL);
  const mediaCdnOrigin = getOrigin(process.env.NEXT_PUBLIC_MEDIA_CDN_URL);

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
  // appear in connect-src for these requests to succeed. Same origin also goes in
  // media-src so the <video> element can load the stream directly.
  if (mediaCdnOrigin) {
    connectSources.add(mediaCdnOrigin);
  }

  const mediaSources = ["'self'", 'blob:'];
  if (mediaCdnOrigin) {
    mediaSources.push(mediaCdnOrigin);
  }

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
  allowedDevOrigins: ['*'],
};

export default nextConfig;
