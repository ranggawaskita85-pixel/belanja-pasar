import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !!! Peringatan: Ini akan mengabaikan error TypeScript saat build.
    ignoreBuildErrors: true,
  },
  eslint: {
    // !!! Peringatan: Ini akan mengabaikan error ESLint saat build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
