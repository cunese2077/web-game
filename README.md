# PlaneWar

***

> H5 Canvas 实现的飞机大战  ✈️

## 命令

```bash
npm install        # 安装依赖

npm run dev        # 开发服务器（Vite，http://localhost:5173，热更新）
npm test           # 运行单元测试（Vitest）
npm run test:watch # 测试监听模式

npm run build      # 构建：tsc 类型检查 + vite build → dist/（单 JS ~42KB gzip）
npm run preview    # 预览生产构建（http://localhost:4173）
npm run typecheck  # 仅类型检查（不产出文件）
```

> 数值调整后请务必运行 `npm test` 回归验证（覆盖敌机 HP 基线、经验曲线、升级系统等 44 条用例）。

## 部署（GitHub Pages）

部署由 GitHub Actions 自动完成（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）：

- **触发条件**：push 到 `main` 分支（也支持在 Actions 页面手动触发）
- **流程**：`npm ci` → `npm run build`（tsc 类型检查 + vite build）→ 将 `dist/` 发布到 GitHub Pages
- **访问地址**：https://cunese2077.github.io/web-game/

无需本地构建或提交产物，推送代码后等 Actions 跑完（约 1 分钟）即自动上线。

> 前置条件（一次性）：仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。

