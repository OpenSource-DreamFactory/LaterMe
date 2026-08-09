import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@laterme/protocol-laterme"],
};

export default nextConfig;
