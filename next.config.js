/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    IS_BUILD: process.env.IS_BUILD,
    SKIP_DB_INIT: process.env.SKIP_DB_INIT,
  },
};

module.exports = nextConfig;