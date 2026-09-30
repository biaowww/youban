# **Tauri 桌面客户端（tauri 分支）**

游伴 YouBan 的 **Tauri v2** 外壳。当前已在 Windows 11 上出包并验证；macOS / iOS / Android 共用同一套配置，需在对应机器上构建。

## **一、分支与改动范围**

`tauri` 分支从 `electron` 切出，**不改 `src/renderer/` 与 `src/data/`**，只动这些：

| 路径 | 作用 |
|---|---|
| `src/src-tauri/**` | Tauri 工程（Rust 外壳、配置、能力、图标） |
| `src/scripts/stage-web.js` | 前端暂存脚本，生成 `src/web-dist/` |
| `src/package.json` | 仅新增 scripts：`stage:web` / `tauri:dev` / `tauri:build` |
| `.gitignore` | 忽略 `src/web-dist/` |
| `docs/Tauri-桌面客户端.md` | 本文 |

UI / 数据改动仍在 `electron` 做，再同步到 `tauri`；**`tauri` 不合并回 `electron`**。

## **二、开发与打包**

前置：Node、Rust（≥1.77）、Windows 需 WebView2（Win11 自带）与 MSVC 构建工具。

```bash
cd src
npm install
npm run tauri dev      # 开发运行（会先跑暂存脚本）
npm run tauri build    # 出 release exe + 安装包（首次编译 Rust 需数分钟）
npm run tauri build -- --no-bundle   # 只要 exe，不打安装包
```

国内网络拉 crates / npm / WiX / NSIS 失败时，走本机代理后重试：

```bash
export HTTPS_PROXY=http://127.0.0.1:10808 HTTP_PROXY=http://127.0.0.1:10808
```

图标由根目录 `logo.png`（512×512）生成，换 logo 后重跑：`npx tauri icon ../logo.png`。

## **三、产物位置**

| 产物 | 路径 |
|---|---|
| 可执行文件 | `src/src-tauri/target/release/youban.exe` |
| NSIS 安装包 | `src/src-tauri/target/release/bundle/nsis/游伴 YouBan_0.2.0_x64-setup.exe` |
| MSI 安装包 | `src/src-tauri/target/release/bundle/msi/游伴 YouBan_0.2.0_x64_zh-CN.msi` |

`target/` 与 `web-dist/` 都是构建产物，不入库。前端资源已内嵌进 exe，`youban.exe` 可单文件运行。

## **四、暂存脚本做了什么**

renderer 不是打包器工程，而是共享全局变量的 `<script>` 标签；且 `preview.html` 引用了 renderer 之外的 `../services/steam/`。Tauri 的 `frontendDist` 必须是自包含目录，所以 `scripts/stage-web.js` 照 `.github/workflows/pages.yml` 的配方组装 `src/web-dist/`：

1. 先跑 `node build-ui.js`（`*.jsx` → `renderer/dist/`，刷新 `mock-data.js`）；加 `--no-build` 可跳过。
2. 拷贝 `dist/ vendor/ assets/ tokens/ fonts/`、五个 css、`adapt.js`、`mock-data.js`、`steam-fixtures.js`。
3. 拷贝 `src/services/steam` → `web-dist/services/steam`。
4. `preview.html` → `web-dist/index.html`，把 `"../services/` 改写成 `"services/`。
5. 自检：`index.html` 里每个本地引用都必须存在，否则报错中止。

入口用 `preview.html` 而非 `index.html`：前者用内嵌的 `mock-data.js`（17 款游戏），**不需要任何 IPC / Tauri 命令**。因此 `withGlobalTauri` 设为 `false`（否则 `adapt.js` 检测到 `window.__TAURI__` 会改走 `invoke`），Rust 侧只负责起窗口。

窗口 1360×860，最小 1024×680 —— 宽度始终 ≥1024，自动进入三栏桌面壳 `DesktopShell`。

## **五、CSP 说明**

| 指令 | 取值 | 原因 |
|---|---|---|
| `default-src` | `'self'` | 默认只信任包内资源 |
| `script-src` | `'self'` | 不开 `unsafe-eval` / `unsafe-inline`；页面里唯一的内联脚本（`window.__YB_BFF__`）由 Tauri 构建时自动加 hash 放行 |
| `style-src` | `'self' 'unsafe-inline'` | 页面有内联 `<style>`，React 组件大量使用内联样式 |
| `font-src` | `'self' data:` | 本地 Noto Sans SC |
| `img-src` | `'self' https: data: blob:` | 封面来自 Steam CDN / wikimedia 等 https 源 |
| `connect-src` | `'self' https: ipc: http://ipc.localhost` | 攻略簿 fetch + SSE 直连线上 HTTPS API；`ipc:` 为 Tauri 内部通道 |

`dangerousDisableAssetCspModification: ["style-src"]`：Tauri 默认会给 style-src 注入 nonce，而 **一旦有 nonce，浏览器就忽略 `'unsafe-inline'`**，内联样式会被拦。故仅对 style-src 关闭自动改写，script-src 仍由 Tauri 加固。

## **六、已知缺口**

- **数据是构建时快照**：游戏数据内嵌于 `mock-data.js`，更新数据需重新打包。
- **本机 BFF 调试被 CSP 拦**：`connect-src` 只放行 `https:`，`http://127.0.0.1:8787` 连不上；需要时临时加进 `connect-src`。
- **登录 / 平台授权仍是 mock UI**，见 `docs/架构方案-Tauri迁移与登录授权.md`。
- **未做代码签名**：安装包会触发 SmartScreen 提示；也未配置自动更新。
- **包体偏大**：4 个 Noto Sans SC 全量 ttf 约 41 MB，后续可子集化。
- 旧脚手架的 `get_game_list` / `get_game_data` 命令已移除（见 git 历史 `13672c2`），要恢复按文件读数据时再加回。

## **七、其它平台的下一步**

这台 Windows 机器只能出 Windows 包，以下需换机器执行。

**macOS**（需 Mac + Xcode Command Line Tools + Rust）：

```bash
cd src && npm install
npm run tauri build        # 产出 .app 与 .dmg，位于 src-tauri/target/release/bundle/
```

对外分发还需 Apple Developer 证书签名与公证。

**iOS**（需 Mac + 完整 Xcode + Apple 开发者账号）：

```bash
cd src && npm install
npm run tauri ios init     # 生成 src-tauri/gen/apple
npm run tauri ios dev      # 模拟器 / 真机调试
npm run tauri ios build
```

**Android**（需 Android Studio / SDK + NDK，配置 `ANDROID_HOME`、`NDK_HOME`、`JAVA_HOME`；Windows 也可以做，但本机未装 SDK）：

```bash
cd src && npm install
npm run tauri android init # 生成 src-tauri/gen/android
npm run tauri android dev
npm run tauri android build
```

移动端注意：窗口宽度 <1024 会自动走手机壳；`preview.html` 已含 ≤520px 的真机全屏与安全区适配。`src-tauri/gen/` 已被忽略，是否入库在移动端立项时再定。
