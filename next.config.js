/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this configuration to handle GitHub Codespaces and other forwarded environments
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        /.*\.app\.github\.dev$/,
        // Add any other domains you might use
      ],
    },
  },
};

module.exports = nextConfig;
