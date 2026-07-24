import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: "/sobre.html",
        destination: "/sobre/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
