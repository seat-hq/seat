/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    // Legacy /docs/<slug> URLs from the original curated docs list now live
    // under /docs/runbooks/<slug>.
    const legacy = ["litepaper", "risk", "allowlist", "phase-1", "phase-1-live", "phase-2", "not-affiliated"];
    return legacy.map((slug) => ({
      source: `/docs/${slug}`,
      destination: `/docs/runbooks/${slug}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
