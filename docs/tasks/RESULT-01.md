# RESULT-01 · 自动化测试 + 数据校验体系

> 分支 `feature/overnight`（从 `electron` 基线 commit 切出）。**未 push、未合并、未动 `tauri`。**

## 一句话结论

**从零搭起 Vitest + jsdom + ESLint 回归体系，完成判据全绿：`build:ui` / `validate:games`(5/5) / `npm test`(86 passed) / `npm run lint`(0 error)。**

## 完成判据复跑结果

| 命令 | 结果 |
|---|---|
| `npm install` | OK（新增 5 个 devDeps） |
| `npm run build:ui` | OK，`dist/` 已更新 |
| `npm run validate:games` | **5/5 全过** |
| `npm test` | **3 文件 86 用例全过** |
| `npm run lint` | **0 error**（5 warning，按规格保留） |
| `npm start` | 见下「未尽事项」——隔夜未启 Electron GUI，已用测试覆盖数据加载/适配路径 |

## 做了什么

### 1. 抽取可测适配层 `renderer/adapt.js`
- 把 `adaptGame` / `loadRawGames` 从 `app.jsx` 原样搬进 `adapt.js`，用「双环境」写法：浏览器挂 `window`，Node/Vitest 走 `module.exports`。
- `app.jsx` 删除两函数定义、改依赖全局；`index.html` / `preview.html` / `preview-multi.html` 均在 `dist/app.js` **之前**注入 `<script src="adapt.js">`。
- 重跑 `build:ui`，三页脚本顺序正确。

### 2. 数据校验 `scripts/validate-games.js`（+ `validate:games`）
- 校验每个游戏 JSON 的必需字段（参照 `adaptGame` 实际用到的字段集）与数值合理性：`progressStart < progressEnd`、各 `progressPct/currentPct ∈ [0,100]`、`steamScore ∈ [0,100]`、**章节区间从 0 连续覆盖到 100、不重叠**。
- 既是 CLI（独立 `node` 运行、错误指明「文件 + 字段」、失败 exit 1），也导出 `validateGame/validateAll/loadGameFiles` 供测试复用。

### 3. 新增测试（`test/`，86 用例）
| 文件 | 覆盖 |
|---|---|
| `schema.test.js` | 5 个真实 JSON 全过；含 5 个负向用例（空对象、区间非法、currentPct/steamScore 越界、章节缺口）确认校验器真的会抓错 |
| `adapt.test.js` | 5 个真实 JSON 逐个跑 `adaptGame`，断言视图模型字段齐全且类型正确（`theme.accent`、`chapters[].end` 为数、`sentiment.quotes[].up` 为数、`save` 为 null 或 `{steps[],path}`）；外加最小输入 `{id,name}` 的安全默认（不抛错、集合字段默认 `[]`、`currentPct` 缺省 0 且显式 0 被保留） |
| `render.test.js` | **每款游戏 × 每个界面**冒烟渲染（5×6 + 品牌页 2 = 32 渲染断言）：`LibraryScreen / ProgressScreen / JourneyScreen / SentimentScreen / MeScreen / DesktopApp(PC) / SplashScreen / LoginScreen`，断言「不抛异常 + 无 `console.error` + 根节点有子元素」 |

### 4. ESLint `eslint.config.js`（扁平配置，+ `lint`）
- `js.configs.recommended` 打底；按域分别配 globals/sourceType（renderer 浏览器脚本、services 双环境、scripts/主进程 Node CJS、test ESM）。
- `dist/`、`vendor/`、`mock-data.js`、`*.legacy.js`、`src-tauri/` 忽略。
- 修掉唯一 error（`main.js` 的 `preserve-caught-error`：给重抛的 Error 补 `{ cause: err }`，不改运行行为）。

### 5. npm scripts
`"test":"vitest run"`、`"lint":"eslint ."`、`"validate:games":"node scripts/validate-games.js"`。

## 关键取舍

- **render 测试用 `jsdom` 的 `runScripts:'dangerously'` 真实注入 `<script>`，而非 indirect-eval。** 因为 vendored React 是 `.production.min.js`（内含 `'use strict'`），用 eval 在严格模式下 `this` 不指向全局会导致 UMD 挂载失败。用真实 JSDOM window 执行最贴近浏览器运行时；附带好处：production 构建不发 dev 警告，`console.error` 噪声为 0，断言更干净。
- **renderer 域关闭 `no-undef`**：组件是「共享全局命名空间」的浏览器脚本（`Icon`/`useState`/`HypeProgress` 等跨文件全局），no-undef 在此语义不成立，会大面积误报。这是按架构关规则，**不是**为过 lint 改运行代码。已在配置文件头写明理由。
- **`no-unused-vars` 降为 warn**：规格允许保留 warning；不删现有少量未用形参（如组件签名里的 `game`），避免动到组件接口。
- **数据未改**：`src/data/games/*.json` 一字未动（5 款章节本就 0→100 连续，校验通过）。

## 未尽事项 / 建议

- **`npm start`（Electron GUI）属人工项**，隔夜无人值守未实际拉起窗口。已间接自检：`build:ui` 成功、`dist/app.js` 仅引用全局 `adaptGame/loadRawGames`（定义已移至 `adapt.js` 且先于 app.js 加载）、数据加载与适配链路被 `adapt.test.js`/`render.test.js` 覆盖。建议主理人本地跑一次 `npm start` 确认游戏库正常显示。
- 5 个 `no-unused-vars` warning 可后续顺手清理（`components.jsx` 的 `peakY`、若干组件签名里的 `game` 形参）。
- render 测试目前断言「能渲染、无报错、有内容」，未做快照/像素级断言；后续如需防 UI 回归可加 DOM 快照。
- 可考虑把 `validate:games` 接进 `build:ui` 前置，或加 git pre-commit hook，进一步防脏数据入库。
