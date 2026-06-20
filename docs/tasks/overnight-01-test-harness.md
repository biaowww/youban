# 任务 01 · 自动化测试 + 数据校验体系（隔夜自动执行）

> 给 Claude Code 的任务规格。先读项目根 `CLAUDE.md` 再动手。这是**可无人值守**任务：以"测试/构建全绿"为完成信号，中途不需要人工决策。

## 目标

为 游伴 YouBan 建立从零开始的自动化测试与数据校验体系，覆盖：游戏数据 schema 校验、`adaptGame` 适配器单测、所有界面的 jsdom 冒烟渲染、ESLint。让以后任何改动都有回归兜底。

## 硬约束（务必遵守）

- **分支**：先在 `electron` 分支把当前工作区未提交改动提交成一个基线 commit（见下「第 0 步」），再从 `electron` 切出 `feature/overnight` 分支，在该分支干。**不要碰 `tauri` 分支。不要 push。**
- **不破坏现有运行**：`npm start`（Electron）和 `src/renderer/preview.html` / `preview-multi.html`（浏览器）改完后必须照常工作。
- **数据源不变**：`src/data/games/*.json` 是唯一数据源；可以新增校验，但**不改其内容/字段名**（除非修明显笔误，且需在 commit 说明里列出）。
- **改了 `*.jsx` 必须重跑 `npm run build:ui`** 重新生成 `dist/`，并把 `dist/` 一起提交。
- 新增依赖用 `npm i -D`；测试框架用 **Vitest + jsdom**（轻、ESM 友好、无需打包器）。
- 全程在 `src/` 下跑 npm（`package.json` 在 `src/`）。
- 标题/文档纯黑、加粗强调、简洁（项目主理人偏好）。

## 第 0 步：基线提交

```
git checkout electron
git add -A
git commit -m "feat(ui): 落地新设计稿(React 组件+adaptGame 适配器)+Tauri 脚手架+多端预览+清理"
git checkout -b feature/overnight
```
> 若 `.git/index.lock` 阻塞，删除该锁文件后重试（这是本机单人仓库，可安全删锁）。

## 子任务

### 1. 抽取可测的适配层
当前 `adaptGame` / `loadRawGames` 定义在 `src/renderer/app.jsx` 内、靠 `window` 暴露，不可被测试 `import`。把它们抽到新文件 **`src/renderer/adapt.js`**（纯 JS，无 JSX、无 React 依赖），写成**双环境**模块：

```js
(function (root) {
  function adaptGame(g) { /* 原样搬过来 */ }
  async function loadRawGames() { /* 原样搬过来 */ }
  root.adaptGame = adaptGame;
  root.loadRawGames = loadRawGames;
  if (typeof module !== 'undefined' && module.exports) module.exports = { adaptGame, loadRawGames };
})(typeof window !== 'undefined' ? window : globalThis);
```

- 从 `app.jsx` 删除这两个函数的定义（保留其余逻辑），改为依赖全局 `adaptGame` / `loadRawGames`。
- 在 `index.html` / `preview.html` / `preview-multi.html` 的脚本顺序里，于 `dist/app.js` **之前**插入 `<script src="adapt.js"></script>`（`adapt.js` 不经 build，直接是普通脚本）。
- 重跑 `npm run build:ui`，确认三个页面仍正常。

### 2. 游戏数据 schema 校验
新增 `src/test/schema.test.js` + 一个可独立运行的校验脚本 `src/scripts/validate-games.js`（加 npm script `validate:games`）：
- 校验 `src/data/games/*.json` 每个文件含必需字段（参照 `adaptGame` 实际用到的字段 + `CONTEXT.md` 的 schema）：`id,name,totalHoursMain,bannerUrl,posterUrl,gameTheme{bg,bgCard,accent,accent2,text},overview{tagline,description,highlights[]},chapters[]{name,planet,progressStart,progressEnd,plotDetail,playerGoals,newCharacters,keyEvent},bossSaves[]{name,progressPct,context{plot,characters,gameplay}},hypePeaks[]{progressPct,label,score},entryPoints[]{progressPct,label,reason},protagonistJourney[]{progressPct,event,description,unlocks[]},playerSentiment{steamScore,keywords{praise,criticism,hot},testimonials[]{text,author,upvotes}}` + 元字段 `titleMain,titleSub,short,currentPct`。
- 数值合理性：`progressStart<progressEnd`、`0<=progressPct<=100`、`0<=currentPct<=100`、`steamScore 0..100`、章节区间覆盖且不重叠。
- 任一不通过 → 测试失败并清楚指出文件+字段。

### 3. adaptGame 单测
新增 `src/test/adapt.test.js`：对 5 个真实 JSON 逐个跑 `adaptGame`，断言输出视图模型字段齐全且类型正确（`theme.accent` 存在、`chapters[].end` 为数、`sentiment.quotes[].up` 为数、`save` 为 null 或 `{steps[],path}` 等）；并对一个手造的最小输入断言所有可选字段有安全默认（不抛错、不 undefined 关键字段）。

### 4. 界面冒烟渲染（jsdom）
新增 `src/test/render.test.js`，在 jsdom 里把 `vendor/react*.min.js` + `dist/components.js`+`screens.js`+`desktop.js`+`adapt.js` 注入到 window，然后对**每款游戏 × 每个界面**渲染并断言"**不抛异常、不产生 console.error、根节点有内容**"：
- 界面：`LibraryScreen`、`ProgressScreen`、`JourneyScreen`、`SentimentScreen`、`MeScreen`、`SplashScreen`、`LoginScreen`、`DesktopApp`（PC）。
- 必要 stub：`ResizeObserver`、`window.matchMedia`、必要时 `HTMLCanvasElement.getContext`。
- 数据来自 `src/data/games/*.json` 经 `adaptGame`。
- 实现方式自选（可用 `vm`/`new Function` 在 jsdom window 执行脚本源码，或 `@testing-library/react`）；目标是**真实组件能用真实数据渲染出来**。

### 5. ESLint
加 `eslint` + 适配 React/JSX 的配置（`eslint.config.js`），加 npm script `lint`。修掉**错误级**问题（warning 可留）。不要为了过 lint 改变运行行为。

### 6. npm scripts
`package.json` 增加：`"test":"vitest run"`、`"lint":"eslint ."`、`"validate:games":"node scripts/validate-games.js"`。

## 完成判据（全绿才算完成）

```
cd src
npm install
npm run build:ui      # 成功，dist/ 更新
npm run validate:games # 5 个 JSON 全过
npm test              # 全部测试通过（schema + adapt + render）
npm run lint          # 无 error 级问题
npm start             # 能启动、显示游戏库（人工项，尽力自检：至少 build 与加载无报错）
```

## 交付

- 全部改动 commit 到 `feature/overnight`（多个语义化 commit）。**不要 push、不要合并、不要动 tauri 分支。**
- 在 `docs/tasks/RESULT-01.md` 写一页结果：做了什么、新增哪些测试/文件、`npm test` 通过数、遇到的问题与取舍、未尽事项。

## 卡住怎么办

- 任一子任务卡死（如 jsdom 注入方案反复失败）：**降级**为可达成的最小版本（例如 render 测试先只覆盖 ProgressScreen），把卡点写进 `RESULT-01.md`，**继续后面的子任务**，不要整夜空转。
- 绝不为了"过测试"而删断言或注释掉功能代码。
