# 游伴 YouBan · 新 UI 落地 + Tauri 迁移 · 运行手册

> 2026-06-15 · 本文是给你按步骤执行的操作手册。代码已写好，**git 提交需要你手动跑**（沙箱里 git 索引损坏，且按约定不在 bash 强删）。

---

## 0. 先修复损坏的 git 索引

沙箱检测到 `.git/index` 损坏（`bad signature / index file corrupt`）。在 **PowerShell** 执行（删除索引后从 HEAD 重建，**不动工作区**）：

```powershell
cd "E:\claude_project\游戏进度陪伴器 Game Companion"
Remove-Item ".git\index" -Force
git reset            # 从 HEAD 重建索引
git status           # 应能正常列出改动
```

---

## 1. 已完成的改动（文件层面）

### 任务一 · 新 UI（electron 分支）

落地方式：设计稿是一套完整 React 应用，**忠实落地的最稳做法是直接采用它的 React 组件**，而非把 2000 行 React 手翻成 vanilla（高风险）。数据管线保持不变。

- **数据源不变**：仍是 `src/data/games/*.json`，经 `window.gameAPI`(IPC) 加载。
- 新增 `src/renderer/`：
  - `app.jsx` — 应用入口：`adaptGame()` 适配器（src JSON → 设计视图模型）、`YBApp` 手机外壳状态机（开屏→登录→游戏库→进度/历程/舆情三 Tab + 各抽屉）、环境自适应数据加载器。
  - `components.jsx` / `screens.jsx` — 来自设计稿的组件与界面（原样复用）。
  - `tokens/*.css` `app.css` `screens.css` `assets/` — 设计系统样式与资源。
  - `vendor/react.min.js` `react-dom.min.js` — **本地** React 运行时（离线可用）。
  - `dist/*.js` — 由 `*.jsx` **预编译**的普通脚本（运行时不需要 Babel，启动更快、CSP 更紧）。
  - `index.html` — 重写：加载本地 React + 预编译产物，居中渲染手机外壳。
- `src/data/games/*.json` — 每款补了 5 个展示元字段：`titleMain / titleSub / short / genre / currentPct`（取自设计稿，内容不变）。
- `src/main.js` — 窗口尺寸改为 472×940（容纳手机外壳）。
- `src/package.json` — 加 `build:ui` 脚本与 `@babel/standalone` devDep；版本 0.2.0。
- `src/build-ui.js` — 改 `.jsx` 后用 `npm run build:ui` 重新生成 `dist/`。
- 旧文件保留为 `renderer.legacy.js` / `styles.legacy.css`（未引用，留作参考）。

> **插画美术**：本轮按你的要求**先占位不生成**——角色头像用设计稿的渐变色块 + 首字母，插画位已预留，后续可一键替换为真实立绘。

### 任务二 · Tauri 迁移（tauri 分支）

关键决策：因为数据加载器做成了**环境自适应**（检测到 `window.__TAURI__` 用 `invoke`，否则用 Electron 的 `gameAPI`），**同一套 renderer 在两个分支都能跑**，tauri 分支只需新增后端，前端零改动、零分叉。

- 新增 `src/src-tauri/`：
  - `Cargo.toml` `build.rs`
  - `src/lib.rs` — 两个命令 `get_game_list` / `get_game_data(id)`，读取 `data/games/*.json`（打包后走资源目录，开发态走相对路径）。
  - `src/main.rs` — 桌面入口；`lib.rs` 含 `mobile_entry_point`，已为 iOS/Android 预留。
  - `tauri.conf.json` — `frontendDist: "../renderer"`、桌面窗口 1240×800、`withGlobalTauri: true`、资源打包 `../data/games/*.json → games/`。
  - `capabilities/default.json` — 默认能力。
  - `icons/icon.png` — 由 `logo.png` 复制（**打包前**建议用 `cargo tauri icon ../../logo.png` 生成全套图标）。

---

## 2. 提交（保持两分支干净）

### 2.1 electron 分支：提交新 UI

> 注意：**不要**把 `src/src-tauri/` 加进 electron 分支。

```powershell
cd "E:\claude_project\游戏进度陪伴器 Game Companion"

# 基线：把设计稿与上下文先入库（可选，但建议）
git add CONTEXT.md design docs
git commit -m "chore: 导入 Claude Design 设计稿 + 项目上下文"

# 新 UI（显式只加 src 下非 tauri 内容）
git add src/main.js src/package.json src/build-ui.js
git add src/data/games
git add src/renderer
git add .gitignore
git status   # 确认暂存区里没有 src/src-tauri
git commit -m "feat(ui): 落地新设计稿 — React 组件 + 适配器，IPC 数据源不变；窗口改手机外壳"
```

### 2.2 tauri 分支：从 electron 切出，加后端

```powershell
git checkout -b tauri

# 删除 Electron 专属文件（Tauri 不需要）
git rm src/main.js src/preload.js

# 加入 Tauri 后端
git add src/src-tauri
git add .gitignore
```

再编辑 `src/package.json`，加入 Tauri 脚本与 CLI（在 `scripts` 与 `devDependencies` 中）：

```jsonc
"scripts": {
  "start": "electron .",
  "build:ui": "node build-ui.js",
  "tauri": "tauri",
  "build": "electron-builder --win --x64"
},
"devDependencies": {
  "@babel/standalone": "^7.29.0",
  "@tauri-apps/cli": "^2",
  "electron": "^41.3.0",
  "electron-builder": "^26.8.1"
}
```

```powershell
git add src/package.json
git commit -m "feat(tauri): 新增 Tauri v2 后端（get_game_list/get_game_data），跨端 release 分支"
```

> 约定遵守：tauri 分支**不**合并回 electron。

---

## 3. 运行与验证

### electron 分支（测试基准）

```powershell
git checkout electron
cd src
npm install      # 若首次或 package.json 变化（装 @babel/standalone）
npm start
```

预期：弹出手机外壳窗口 → 开屏页「开始」→ 登录页（任一登录按钮）→ 游戏库 → 点封面进入 → 底部「进度 / 历程 / 舆情」三 Tab，Hype 波形可拖动、Boss/入场点抽屉、玩家舆情、切换游戏、「我的」平台同步均可用。

> 改了 `src/renderer/*.jsx` 后，先 `npm run build:ui` 再 `npm start`。

### tauri 分支（正式 release）

需要 Rust 工具链（`rustup`）+ WebView2（Win10/11 一般已内置）。

```powershell
git checkout tauri
cd src
npm install
npm run tauri dev      # 等价 cargo tauri dev
```

打包：

```powershell
cargo tauri icon ../../logo.png   # 首次：生成全套图标
npm run tauri build
```

---

## 4. 已知事项 / 后续

- **离线**：React 运行时已本地化；字体仍走 Google Fonts（缺网时优雅降级到本地 Noto/系统字体），后续可本地化字体彻底离线。
- `src/renderer/vendor/babel.min.js`（3MB，改为预编译后已不用）：已在 `.gitignore` 排除，可手动删除本地文件。
- **Tauri 桌面布局**：当前 PC 端复用手机 UI（1240×800 窗口内居中）。设计稿的 PC 专属布局（`design/lib/desktop.jsx`）为后续单独任务。
- **登录/平台授权**：当前为 mock UI（开屏/登录/平台连接）。真授权（Steam/WeGame/TapTap）见架构方案文档，待 BFF 后端就绪后接入。
- Rust 后端未能在本环境编译验证（Windows 目标 + 无工具链）；JSON/TOML 配置已校验，代码为 Tauri v2 标准写法，`tauri dev` 首次会拉取 crates 并编译。
