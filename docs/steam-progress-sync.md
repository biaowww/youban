# Steam 成就 → 进度 同步管线

> 路线图 v0.3：用 Steam 成就实时读进度。本页说明数据流、为什么 Key 必须在服务端，以及本引擎/契约在真 BFF 就绪后如何接入。

## 数据流（前端 → BFF → Steam）

```
玩家 SteamID64
      │
      ▼
┌─────────────┐   只调自己的后端    ┌──────────────────┐   持 Key 调 Steam   ┌────────────────┐
│  前端 / 客户端 │ ───────────────▶ │  BFF 服务端（你的） │ ───────────────▶ │  Steam Web API  │
│ (Tauri/小程序) │ ◀─────────────── │  STEAM_API_KEY    │ ◀─────────────── │                │
└─────────────┘   归一化后的进度     └──────────────────┘   原始 JSON 响应    └────────────────┘
      │
      ▼
  progressFromAchievements(gameJson, resp) → { currentPct, ... }
```

- **身份**：Steam 登录用 **OpenID 2.0**，拿到 `SteamID64`。
- **读数据**：用 **Steam Web API Key** 调 `IPlayerService/GetOwnedGames`、`ISteamUserStats/GetPlayerAchievements`；要求用户档案（游戏详情）**公开**。

## 为什么 Key 必须在服务端

**Steam Web API Key 等价于一个长期凭证**：泄露后任何人都能以你的配额发请求、被限流甚至封禁。它**只能在服务端使用**，绝不能进前端 / 小程序包（前端代码与网络请求对用户完全可见）。因此：

- Key 走**服务端环境变量**（如 `process.env.STEAM_API_KEY`），不入版本库、不下发前端。
- 前端只认识**自己的 BFF**（`/api/steam/...`），由 BFF 持 Key 代调 Steam 并把响应转交前端。
- 本任务**不碰真实 Key、不发真实请求**，全部用 mock fixtures 驱动，确定性、离线、可重复。

## 本仓库交付了什么（与服务端无关的纯逻辑）

| 文件 | 作用 |
|---|---|
| `src/services/steam/types.js` | JSDoc 契约：Steam 原始响应形状 + 应用内归一化类型（`OwnedGame` / `AchievementState` / `GameProgress`） |
| `src/services/steam/progress.js` | **核心纯函数** `progressFromAchievements(gameJson, playerAchievements) → GameProgress`，框架无关、双环境 |
| `src/services/steam/client.js` | BFF 接口契约 + `MockSteamClient`（从 fixtures 取数，**不发网络**） |
| `src/test/fixtures/steam/` | 2 款游戏 × {部分解锁 / 全解锁 / 无解锁 / 私密档案} 的真实形状响应 + `manifest.json` |
| `src/test/steam-progress.test.js` | fixtures 驱动的确定性单测 |

### 进度算法（`progressFromAchievements`）

- 映射表 = 游戏 JSON 的 `achievements[]`（`steamId` → `progressPct`）。
- 与玩家**已解锁**成就（`achieved===1`）求交集。
- `currentPct` = 交集里 `progressPct` 的**最大值**（夹在 `0..100`）；无任何解锁 → `0`。
- 同时返回 `unlockedCount / totalCount / matchedAchievement`（决定 pct 的那条），便于 UI 展示「最近解锁」。
- 边界：
  - 私密档案（`success:false`）→ 返回带 `error: 'PROFILE_PRIVATE'` 的降级结果（不抛，UI 友好提示）。
  - 游戏无映射表 → `error: 'NO_ACHIEVEMENTS_MAP'`。
  - 入参缺失（`null`）→ 抛可识别错误。

## 真 BFF 就绪后如何接入

1. **服务端**实现两个端点（持 Key、调 Steam、按 `types.js` 归一化）：
   - `GET /api/steam/owned?steamId=...` → `OwnedGame[]`
   - `GET /api/steam/achievements?steamId=...&appId=...` → `GetPlayerAchievementsResponse`
2. **前端**新增一个 `HttpSteamClient`，方法签名与 `MockSteamClient` 完全一致：
   ```js
   getOwnedGames(steamId)            // → fetch('/api/steam/owned?...')
   getPlayerAchievements(steamId, appId) // → fetch('/api/steam/achievements?...')
   ```
   把开发期的 `MockSteamClient` 换成 `HttpSteamClient` 即可，**进度引擎 `progressFromAchievements` 与调用方零改动**。

## 与 `ProgressInput` 的「Steam 成就」Tab 将来如何对接

当前 `src/renderer/screens.jsx` 的 `ProgressInput` 里，「Steam 成就」Tab 是 **mock UI**：点「读取」后用 `Math.max(...game.ach.filter(a=>a.pct<100).map(a=>a.pct))` 假装同步。接入步骤（**属后续任务，本次不动 UI**）：

1. 用户在输入框填 `SteamID64`（或经 OpenID 登录拿到）。
2. 调 `client.getPlayerAchievements(steamId, game.steamAppId)` 取响应。
3. 交给 `progressFromAchievements(rawGameJson, resp)` 得 `GameProgress`。
4. `setValue(progress.currentPct)`；用 `matchedAchievement` 渲染「最近解锁：XXX」；`error` 时提示「档案需公开」。

> 注意：引擎吃的是**原始游戏 JSON 的 `achievements`**（`steamId`），UI 侧的 `game.ach` 是 `adaptGame` 后的视图模型（`id`/`pct`，与原始 `progressPct` 一致）。两者口径已在测试中对齐。
