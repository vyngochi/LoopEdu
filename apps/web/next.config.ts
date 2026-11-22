import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Ảnh Docker đặt NEXT_OUTPUT=standalone (xem apps/web/Dockerfile). Trong monorepo, gốc theo dõi file phải là gốc repo.
  ...(process.env.NEXT_OUTPUT === "standalone" && {
    output: "standalone" as const,
    outputFileTracingRoot: path.join(process.cwd(), "../.."),
  }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
