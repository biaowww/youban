# 任务 02 · Steam 成就 → 进度 同步管线（纯逻辑 + fixtures，隔夜自动执行）

> 给 Claude Code 的任务规格。先读项目根 `CLAUDE.md` 与任务 01。推进路线图 v0.3（Steam 成就实时读进度），**不碰真实密钥、不发真实网络请求**——全部用 mock fixtures 驱动，可无人值守、可自我验证。

## 背景（已核实的事实）

- Steam 身份登录用 **OpenID 2.0**（拿到 SteamID64）。
- 读游戏库/时长/成就用 **Steam Web API Key**，端点如 `ISteamUserStats/GetPlayerAchievements`、`IPlayerService/GetOwnedGames`；**Key 只能在服务端用，绝不能进前端/小程序**，且用户档案需公开。
- 所以真实架构是：前端 → 自己的 **BFF 服务端**（持 Key、调 Steam）→ 返回给前端。本任务**只做与服务端无关的纯逻辑引擎 + 接口契约 + mock 客户端**，为日后接真 BFF 留好插口。
- 每个游戏 JSON 里已有 `achievements[]`（`steamId` / `name` / `progressPct`）——这是"成就 → 进度百分比"的映射表，本任务的核心数据。

## 硬约束

- 在任务 01 的同一分支 `feature/overnight` 上继续（任务 01 已搭好 Vitest）。**不要 push、不要动 `tauri` 分支。**
- **纯逻辑**：新代码不依赖 Electron / Tauri / DOM / 网络；可在 Node 与浏览器两端复用。
- **不接 UI**：本任务只交付引擎 + 契约 + 测试 + fixtures + 文档；**不**改 `app.jsx` 的界面、不动 `ProgressInput` 的现有 mock 行为（接 UI 是后续任务）。
- 不引入真实 Key、不发真实请求；测试必须**确定性**（离线、可重复）。
- 数据源 `src/data/games/*.json` 不改。

## 交付物

### 1. 类型与契约 `src/services/steam/types.js`
用 JSDoc 定义（本项目无 TS，用 JSDoc typedef）：
- Steam Web API 响应形状：`GetOwnedGamesResponse`、`GetPlayerAchievementsResponse`（含 `playerstats.achievements[]{apiname,achieved,unlocktime}`、`success`、错误态）。
- 应用内归一化类型：`OwnedGame`、`AchievementState`、`GameProgress{ currentPct, source, unlockedCount, totalCount, matchedAchievement }`。

### 2. 进度映射引擎 `src/services/steam/progress.js`（核心，纯函数）
- `progressFromAchievements(gameJson, playerAchievements) -> GameProgress`：
  - 取 `gameJson.achievements`（steamId→progressPct 映射），与玩家已解锁成就（`achieved===1`）求交集；
  - `currentPct = 已解锁成就里对应 progressPct 的最大值`（夹在 0..100）；无任何解锁 → 0；
  - 返回同时带上 `unlockedCount/totalCount/matchedAchievement(决定 pct 的那个)`，便于 UI 展示"最近解锁"。
  - 边界：成就表为空、玩家全解锁（→ 接近/等于 100）、`success=false`（私密档案）→ 抛可识别错误或返回带 `error` 的结果（自定，但要在测试里覆盖）。
- 保持框架无关、可被 `import` 也可挂 `window`（参照任务 01 的 `adapt.js` 双环境写法）。

### 3. BFF 接口契约 + Mock 客户端 `src/services/steam/client.js`
- 定义前端将调用的接口（日后由真 BFF 实现）：
  - `getOwnedGames(steamId) -> Promise<OwnedGame[]>`
  - `getPlayerAchievements(steamId, appId) -> Promise<GetPlayerAchievementsResponse>`
- 提供 `MockSteamClient`：从 `src/test/fixtures/steam/` 读 fixtures 返回，模拟成功/私密档案/无成就三种情形；**不发网络**。
- 写清注释：真实实现应放服务端，Key 走环境变量，前端只调 BFF。

### 4. Fixtures `src/test/fixtures/steam/`
为至少 **2 款游戏**造真实形状的 `GetPlayerAchievements` 响应（建议 `jedi_fo`/appid 1172380、`black_myth_wukong`/appid 2358720），各含：部分解锁、全解锁、私密档案 三个样本。`apiname` 用各游戏 JSON 里 `achievements[].steamId`，保证能和映射表对上。

### 5. 单测 `src/test/steam-progress.test.js`
- 用 fixtures 驱动 `progressFromAchievements`，断言算出的 `currentPct` 等于预期（部分解锁→中间值、全解锁→满、私密→错误/降级）。
- 断言 `MockSteamClient` 三种情形行为正确。
- 覆盖与 `adaptGame` 的衔接：`adaptGame(gameJson).ach` 与映射逻辑一致（同一套 progressPct）。

### 6. 文档 `docs/steam-progress-sync.md`
一页说明：数据流（前端→BFF→Steam）、为何 Key 必须在服务端、本引擎/契约如何在 BFF 就绪后接入（把 `MockSteamClient` 换成真实 HTTP 客户端即可）、与 `ProgressInput` "Steam 成就" Tab 将来如何对接。纯黑标题、加粗强调。

## 完成判据

```
cd src
npm test     # 任务01 + 任务02 全部测试通过
npm run lint # 无 error
```
（本任务不需要 `npm start` 验证，因为未接 UI。）

## 交付

- commit 到 `feature/overnight`。**不 push、不合并、不动 tauri。**
- 写 `docs/tasks/RESULT-02.md`：交付了哪些文件、测试覆盖了哪些情形、`currentPct` 算法的取舍、真实 BFF 接入的 TODO。

## 卡住怎么办

- 某游戏的成就映射不足以推出有意义的进度：在 fixtures 里用该游戏 JSON 现有 `achievements` 能支持的样本即可，把局限写进 `RESULT-02.md`，不要编造游戏 JSON 里没有的成就。
- 不确定的产品取舍（如 currentPct 该取 max 还是按章节加权）：**实现 max 版本**（与本规格一致）并在 RESULT 里列出备选，留给主理人决定。
