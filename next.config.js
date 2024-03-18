/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['hoppscotch.io', 'localhost:3000'],
      allowedForwardedHosts: ['hoppscotch.io', 'localhost:3000'],
    },
    // serverComponentsExternalPackages: ['oslo'],
  },
  webpack: (config) => {
    config.externals.push('@node-rs/argon2', '@node-rs/bcrypt');
    return config;
  },
};

module.exports = nextConfig;
