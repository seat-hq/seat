import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const wagmiCoreRoot = path.dirname(require.resolve("@wagmi/core/package.json"));
const injectedConnector = path.join(
  wagmiCoreRoot,
  "dist/esm/connectors/injected.js",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The SDK ships as TS/ESM in the workspace; transpile it with the app.
  transpilePackages: ["@seat/sdk", "@wagmi/core"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Bypass package exports so we can import injected without the
      // wagmi/connectors barrel (Coinbase Base Account → missing @x402/evm).
      "@seat/injected-connector": injectedConnector,
    };
    return config;
  },
};

export default nextConfig;
