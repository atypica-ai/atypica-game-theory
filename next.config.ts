import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure WebSocket library is handled correctly on server side
      config.externals = config.externals || [];
      config.externals.push("ws");
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "*localhost*" },
      { protocol: "https", hostname: "*bmrlab*" },
      { protocol: "https", hostname: "*atypica*" },
      { protocol: "https", hostname: "*musedam*" },
      { protocol: "https", hostname: "*musecdn*" },
      { protocol: "https", hostname: "**.hippyghosts.io" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
    ],
    localPatterns: [{ pathname: "/_public/**" }],
  },
  // Allow cross-origin requests from development domain
  allowedDevOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS
    ? process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(",")
    : [],
  experimental: {
    // see https://nextjs.org/docs/app/api-reference/functions/forbidden
    authInterrupts: true,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
