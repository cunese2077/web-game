// ESLint 配置（Node 16 兼容：eslint@8 + typescript-eslint@7）
// 重点：禁 any、未使用变量/导入等 tsc 查不出的问题
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    // 项目硬约束：TypeScript 代码禁止 any
    "@typescript-eslint/no-explicit-any": "error",
    // 统一用 import type 导入类型（隔离运行时导入）
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
    // 未使用变量/导入报错（_ 前缀豁免，用于有意忽略的参数）
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // 允许非空断言（canvas/DOM 场景常用）
    "@typescript-eslint/no-non-null-assertion": "off",
    // 循环内 await：游戏引擎无异步循环依赖
    "no-await-in-loop": "off",
  },
  ignorePatterns: ["dist/", "node_modules/", "js/"],
};
