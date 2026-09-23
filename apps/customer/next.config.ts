import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Next.js turbopack type might be incomplete
  turbopack: {
    root: "../../",
  },
  // @ts-ignore
  allowedDevOrigins: [
    "192.168.0.108",
    "localhost",
    "127.0.0.1",
    ...(process.env.ALLOWED_DEV_ORIGINS ? process.env.ALLOWED_DEV_ORIGINS.split(",") : [])
  ],
};

export default nextConfig;
