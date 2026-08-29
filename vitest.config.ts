// Vitest 配置（与 vite.config.ts 分离，测试运行在 node 环境，不依赖浏览器 DOM）
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
