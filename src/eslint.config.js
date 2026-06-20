/* ============================================================
   游伴 YouBan · ESLint 扁平配置（ESLint v9+）
   架构说明：renderer/*.jsx 是「共享全局命名空间」的浏览器脚本——组件之间
   不经模块系统、靠 window 全局互相调用（components 先声明 hooks，screens/
   desktop/app 复用）。因此在 renderer 域内 no-undef 没有意义（会把 Icon /
   useState / HypeProgress 等跨文件全局误报为未定义），这里显式关闭，而非为了
   过 lint 去改运行架构。其余 recommended 规则保留；no-unused-vars 降级为 warn。
   ============================================================ */
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'renderer/dist/**',
      'renderer/vendor/**',
      'renderer/mock-data.js',     // build:ui 生成产物
      'renderer/*.legacy.js',      // 旧实现，保留不维护
      'node_modules/**',
      'src-tauri/**',
    ],
  },

  js.configs.recommended,

  // —— renderer：浏览器共享全局脚本（含 JSX）——
  {
    files: ['renderer/**/*.js', 'renderer/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, React: 'readonly', ReactDOM: 'readonly' },
    },
    rules: {
      'no-undef': 'off',          // 跨文件全局架构，见文件头说明
      'no-unused-vars': 'warn',
    },
  },

  // —— 纯逻辑服务层（Node + 浏览器双环境）——
  {
    files: ['services/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, window: 'readonly', globalThis: 'readonly' },
    },
    rules: { 'no-unused-vars': 'warn' },
  },

  // —— 校验/构建脚本与 Electron 主进程（Node CJS）——
  {
    files: ['scripts/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: { 'no-unused-vars': 'warn' },
  },

  // —— 测试（ESM，Node）——
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { 'no-unused-vars': 'warn' },
  },
];
