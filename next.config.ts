import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // Include docs in standalone output for features pages
  outputFileTracingIncludes: {
    "/(features)/features/[slug]": ["./docs/**/*"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure WebSocket library is handled correctly on server side
      config.externals = config.externals || [];
      config.externals.push("ws");
      // Externalize just-bash and its native dependencies (bash-tool itself should be bundled)
      config.externals.push("just-bash");
      config.externals.push("@mongodb-js/zstd");
      config.externals.push("node-liblzma");
      config.externals.push("sql.js");
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
      { protocol: "https", hostname: "**.xhscdn.com" },
      { protocol: "http", hostname: "**.xhscdn.com" },
      { protocol: "https", hostname: "**.xiaohongshu.com" },
      { protocol: "http", hostname: "**.xiaohongshu.com" },
      { protocol: "https", hostname: "**.douyinpic.com" },
      { protocol: "https", hostname: "**.tiktokcdn*.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.twimg.com" },
      { protocol: "https", hostname: "**.hippyghosts.io" },
      { protocol: "https", hostname: "**.qlogo.cn" },
      { protocol: "https", hostname: "substackcdn.com" },
      { protocol: "https", hostname: "**.substack.com" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
    ],
    localPatterns: [
      { pathname: "/api/imagegen/dev/**" /*, search:"" */ },
      { pathname: "/artifacts/report/*/cover" },
      { pathname: "/_public/**" },
    ],
    // loader: "custom",
    // loaderFile: "./lib/imageLoader",
  },
  // Allow cross-origin requests from development domain
  allowedDevOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS
    ? process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(",")
    : [],
  experimental: {
    // see https://nextjs.org/docs/app/api-reference/functions/forbidden
    authInterrupts: true,
    // 这个暂时不需要，通过 proxy 改写了 host 和 origin
    // serverActions: {
    //   allowedOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS
    //     ? process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(",")
    //     : [],
    // },
  },
  async rewrites() {
    return [
      { source: "/changelog.html", destination: "/_public/changelog.html" },
      { source: "/changelog", destination: "/_public/changelog.html" },
      { source: "/about", destination: "/_public/about.html" },
    ];
  },
  logging: {
    incomingRequests: {
      ignore: [/^\/cdn\//],
    },
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
