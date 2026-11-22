import { defineConfig } from "vitest/config";

// Ảnh brand (png/svg) là StaticImageData trong Next; ở test chỉ cần đủ src/width/height để next/image render.
const stubImages = {
  name: "stub-static-images",
  enforce: "pre" as const,
  transform(_code: string, id: string) {
    if (/\.(png|svg)$/.test(id)) return 'export default { src: "/stub.png", width: 400, height: 300 };';
  },
};

export default defineConfig({
  plugins: [stubImages],
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.test.tsx"] },
});
