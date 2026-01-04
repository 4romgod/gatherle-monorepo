/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Mark server-only modules as external to prevent them from being bundled for the client
      config.externals = config.externals || [];
      config.externals.push({
        'type-graphql': 'commonjs type-graphql',
      });
    }
    return config;
  },
};

export default nextConfig;
