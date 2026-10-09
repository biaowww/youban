# AGENTS.md — 游伴 YouBan

给 Codex 的项目工作手册。开 Codex 时在**项目根目录**启动，它会自动读到本文件。

## 这是什么

游伴 YouBan — 帮玩家快速体验超长 3A 游戏的**进度陪伴**应用，面向中国市场本地化。当前 17 款游戏（买手店式多平台精选）。**技术总览与开发路径见 Drive 文档库 `元艺极客和超元/游伴YouBan/03-技术/游伴YouBan-技术总览与开发路径.md`**（先读这份）。

## 文档在哪里（2026-10-09 起）

产品文档与设计物料**不在本仓库**，canonical 在 Google Drive 业务文档库 `元艺极客和超元/游伴YouBan/`（飞书 `超元master/游伴YouBan/` 为团队镜像）。开发时通过 gdrive MCP 挂载 biaoOS 总线读取。目录：01-产品（PRD）、02-设计（UI 设计文档 + 高保真原型 + 截图 + 品牌资产）、03-技术（总览/攻略簿 AI/账号/进度识别/跨端 + 调研笔记）、04-运营合规、05-发布（安装包）、09-历史留档。入口导读：`00-导读/游伴YouBan-文档地图.md`。

## 关联位置速查

| 位置 | 路径 | 作用 |
|---|---|---|
| **工程代码（本仓库）** | `E:\claude_project\youban`（PC；MacBook 上为 clone 目标路径）；GitHub `biaowww/youban`（`electron` 主线 / `tauri` 发布线） | 全部源码 + AI 协作手册，git 管版本 |
| **产品文档 canonical** | Google Drive `元艺极客和超元/游伴YouBan/` | PRD / 设计 / 技术 / 运营 / 发布 / 留档；改动先改这里 |
| **团队镜像** | 飞书云盘 `超元master/游伴YouBan/` | 给团队的镜像，可与 Drive 分化 |
| **中台总线** | Drive `biaoOS/domains/youban/`（AGENTS.md / memory.md / tasks.md） | 登记 / 记忆 / 任务清单，不存文档本体 |
| **Web 内测 demo** | https://biaowww.github.io/youban/ | v10 内测入口 |

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
| 对外 API（账号 / 进度 / AI 攻略簿） | `backend/bff/`（零依赖 Node；部署见 `backend/README.md`） |
| 策划 / 架构 / 方案文档 | Drive `游伴YouBan/03-技术/`（入口：技术总览与开发路径） |
| 设计稿参考（只读） | Drive `游伴YouBan/02-设计/高保真原型/`（整夹下载后双击 HTML 可开） |
| **v10 新版 UI 落地** | **动手前必读 Drive `游伴YouBan/02-设计/v10-新版UI-实施说明.md`**（定稿原型 `高保真原型/游伴 v10 新版UI完整稿.html`）。铁律：新分支开发、v9 界面只加不改、数据 schema 不动 |

## 架构要点（改之前先懂这几条）

- **数据源唯一**：`src/data/games/*.json`。UI 不直接读它，先经 `src/renderer/app.jsx` 的 **`adaptGame()`** 适配成视图模型（src 字段 → 短字段）。改了 JSON 的字段名要同步改 adaptGame。
- **数据加载环境自适应**：`loadRawGames()` 检测到 `window.__TAURI__` 用 Tauri `invoke`，否则用 Electron `window.gameAPI`。**所以同一套 renderer 两个分支通用**。
- **前端无运行时 Babel**：`*.jsx` 由 `src/build-ui.js`（`npm run build:ui`）预编译成 `src/renderer/dist/*.js`，配合本地 `vendor/react*.min.js`，离线、启动快。**`dist/` 是产物，改的是 `*.jsx`，记得重编译。**
- 屏幕状态机在 `app.jsx` 的 `YBApp`：开屏 → 登录 → 游戏库 → 进度/历程/舆情三 Tab + 各抽屉。
- **登录是真的**（2026-09-30 起）：内测账号经对外 API（`backend/bff`）→ Supabase Auth，进度与攻略簿跨端同步；客户端侧逻辑在 `src/renderer/account.js`。微信 / 手机号 / 平台绑定尚未接通，界面如实标注。见 Drive `游伴YouBan/03-技术/游伴YouBan-账号与数据永久化设计.md`。
- **宽屏（≥1024px）走 `DesktopShell` 三栏**（`desktop.jsx`），窄屏走手机壳；同一套代码。

## 约定 / 注意

- 不要把 `index.html` 直接用浏览器 file:// 打开看——它需要数据后端（Electron/Tauri），裸开会显示"无可用数据源"。要预览设计用 Drive 文档库 `02-设计/高保真原型/` 里的 HTML 原型。
- `src/renderer/vendor/babel.min.js` 已弃用（改预编译），`.gitignore` 已排除。
- 本仓库**只放工程代码与 AI 协作必需文件**。产品文档、设计稿、调研、安装包统一在 Drive 文档库 `元艺极客和超元/游伴YouBan/`（2026-10-09 迁出，git 历史可找回）。效率插件的 `dashboard.html`、`TASKS.md` 等不属于这里，已在 `.gitignore` 排除。
- 文档/标题用纯黑、加粗强调（项目主理人偏好）。
