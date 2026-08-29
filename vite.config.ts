// Vite 配置
// - 入口：index.html → src/engine.ts（Vite 原生转译 TS，dev 模式带 HMR）
// - 静态资源：public/img/* → 构建时原样拷贝到 dist/img/*，代码中 "img/xxx.png" 相对路径无需改动
// - base './'：产物可用任意路径部署（含子目录），不依赖站点根
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: "es2020",
    // 产物命名带内容 hash，利于长缓存
    assetsInlineLimit: 0,
  },
});
