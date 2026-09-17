/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The SDK ships as TS/ESM in the workspace; transpile it with the app.
  transpilePackages: ["@seat/sdk"],
};

export default nextConfig;
