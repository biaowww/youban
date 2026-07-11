# CLAUDE.md — 游伴 YouBan

给 Claude Code 的项目工作手册。开 Claude Code 时在**项目根目录**启动，它会自动读到本文件。

## 这是什么

游伴 YouBan — 帮玩家快速体验超长 3A 游戏的**进度陪伴**应用，面向中国市场本地化。当前支持 5 款游戏（JFO / 黑神话 / Max Payne 3 / TLOU I & II）。

## 分支模型（重要）

- **`electron`** — 本地开发 / QA 基准。`npm start` 跑得起来。日常改 UI、调数据在这条线。
- **`tauri`** — 正式 release（跨端：PC / iOS / Android）。从 electron 切出，**只多了 `src/src-tauri/`** 后端，前端共用。
- 规则：**`tauri` 不要合并回 `electron`**。UI/数据的改动在 electron 做完、验证 OK，再 cherry-pick / 同步到 tauri。

## 跑起来

```bash
cd src
npm install              # 首次 / 依赖变化
npm start                # electron 分支：开发运行
npm run build:ui         # 改了 renderer/*.jsx 后，重新预编译 dist/
# tauri 分支：
npm run tauri dev        # 需 Rust 工具链；等价 cargo tauri dev
npm run tauri build      # 打包；首次先 cargo tauri icon ../../logo.png
```

## 目录地图 — 什么事在哪做

| 要做的事 | 去这里 |
|---|---|
| 改界面 / 交互 / 样式 | `src/renderer/*.jsx`（改完跑 `npm run build:ui`）、`src/renderer/*.css`、`src/renderer/tokens/` |
| 加 / 改游戏内容数据 | `src/data/games/*.json`（新增游戏=丢一个 JSON，自动发现，无需注册） |
| Electron 外壳 / IPC | `src/main.js`、`src/preload.js`（仅 electron 分支） |
| Tauri 后端 / 命令 / 配置 | `src/src-tauri/`（仅 tauri 分支：`src/lib.rs` 命令、`tauri.conf.json`） |
| 策划 / 架构 / 方案文档 | `docs/` |
| 设计稿参考（只读） | `design/`（`design/游伴 YouBan.html` 是可直接浏览器打开的高保真原型） |
| **v10 新版 UI 落地** | **动手前必读 `design/v10-新版UI-实施说明.md`**（定稿原型 `design/游伴 v10 新版UI完整稿.html`）。铁律：新分支开发、v9 界面只加不改、数据 schema 不动 |

## 架构要点（改之前先懂这几条）

- **数据源唯一**：`src/data/games/*.json`。UI 不直接读它，先经 `src/renderer/app.jsx` 的 **`adaptGame()`** 适配成视图模型（src 字段 → 短字段）。改了 JSON 的字段名要同步改 adaptGame。
- **数据加载环境自适应**：`loadRawGames()` 检测到 `window.__TAURI__` 用 Tauri `invoke`，否则用 Electron `window.gameAPI`。**所以同一套 renderer 两个分支通用**。
- **前端无运行时 Babel**：`*.jsx` 由 `src/build-ui.js`（`npm run build:ui`）预编译成 `src/renderer/dist/*.js`，配合本地 `vendor/react*.min.js`，离线、启动快。**`dist/` 是产物，改的是 `*.jsx`，记得重编译。**
- 屏幕状态机在 `app.jsx` 的 `YBApp`：开屏 → 登录 → 游戏库 → 进度/历程/舆情三 Tab + 各抽屉。
- 登录/平台授权目前是 **mock UI**；真授权（Steam/WeGame/TapTap）需要 BFF 后端，见 `docs/架构方案-Tauri迁移与登录授权.md`。

## 约定 / 注意

- 不要把 `index.html` 直接用浏览器 file:// 打开看——它需要数据后端（Electron/Tauri），裸开会显示"无可用数据源"。要预览设计用 `design/游伴 YouBan.html`。
- `src/renderer/vendor/babel.min.js` 已弃用（改预编译），`.gitignore` 已排除。
- 本仓库**只放项目代码与文档**。效率插件的 `dashboard.html`、`TASKS.md` 等不属于这里，已在 `.gitignore` 排除。
- 文档/标题用纯黑、加粗强调（项目主理人偏好）。
