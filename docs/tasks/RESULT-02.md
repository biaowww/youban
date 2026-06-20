# RESULT-02 · Steam 成就 → 进度 同步管线

> 同分支 `feature/overnight`（接任务 01 的 Vitest 体系）。**未 push、未合并、未动 `tauri`。不碰真实 Key、不发真实请求。**

## 一句话结论

**交付与服务端无关的纯逻辑进度引擎 + BFF 契约 + Mock 客户端 + fixtures + 16 条确定性单测；完成判据全绿：`npm test` 102 passed（任务01+02）、`npm run lint` 0 error。**

## 完成判据复跑结果

| 命令 | 结果 |
|---|---|
| `npm test` | **4 文件 102 用例全过**（其中 steam-progress 16 条） |
| `npm run lint` | **0 error**（5 warning，均为既有，services/ 无新增） |

## 交付物

| 文件 | 内容 |
|---|---|
| `src/services/steam/types.js` | JSDoc 契约：`GetOwnedGamesResponse` / `GetPlayerAchievementsResponse`（含 `playerstats.achievements[]{apiname,achieved,unlocktime}`、`success`、`error`）+ 归一化类型 `OwnedGame` / `AchievementState` / `GameProgress` |
| `src/services/steam/progress.js` | 核心纯函数 `progressFromAchievements(gameJson, playerAchievements) → GameProgress`，框架无关、双环境（可 import / 挂 window） |
| `src/services/steam/client.js` | BFF 接口契约（`getOwnedGames` / `getPlayerAchievements`）+ `MockSteamClient`（离线、不发网络）+ Node 便捷 `MockSteamClient.fromFixtureDir(dir)` |
| `src/test/fixtures/steam/` | `jedi_fo`(1172380) 与 `black_myth_wukong`(2358720) 各 4 个样本（部分解锁 / 全解锁 / 无解锁 / 私密档案）+ `manifest.json`（owned + steamId→appId→文件映射） |
| `src/test/steam-progress.test.js` | 16 条单测 |
| `docs/steam-progress-sync.md` | 数据流、Key 为何在服务端、接真 BFF 与对接 `ProgressInput` 的步骤 |

## 测试覆盖了哪些情形

- **部分解锁 → 中间值**：jedi 解锁至 pct44 → `currentPct=44`、`unlockedCount=5`、`matched=ACH_STORY_NINTH`；wukong 解锁至 pct40 → `currentPct=40`、`matched=ACH_SPIDER`。
- **全解锁 → 满**：`currentPct=100`、`matched` 为 100% 那条（`ACH_STORY_END`）。
- **无解锁**：`currentPct=0`、`matched=null`、**无 error**（只是还没玩）。
- **私密档案（success=false）**：降级结果 `error='PROFILE_PRIVATE'`、`currentPct=0`，但 `totalCount` 仍可知。
- **游戏无映射表**：`error='NO_ACHIEVEMENTS_MAP'`，不抛。
- **入参容错**：可直接传成就数组；传 `null` 抛可识别错误；`progressPct` 越界仍夹到 0..100。
- **MockSteamClient 三情形**：`getOwnedGames` 归一化输出；成功/私密/无解锁三种 `getPlayerAchievements` 行为；未知 (steamId,appId) → reject。
- **与 `adaptGame` 衔接**：`adaptGame(game).ach`（`id→pct`）与原始 `achievements`（`steamId→progressPct`）逐项一致；引擎 `matched` 能在视图模型里找到同名同 pct 条目。

## `currentPct` 算法的取舍

- **按规格实现 `max` 版本**：`currentPct = 已解锁且命中映射表的成就里 progressPct 的最大值`。直观、单调、对「跳关/乱序解锁」稳健（只要解锁了靠后的剧情成就，进度就到那）。
- **备选（留给主理人决定）**：
  1. **按章节加权**：用解锁成就数 / 映射成就数估算，平滑但与「剧情位置」脱节。
  2. **最近解锁时间**：取 `unlocktime` 最大的成就对应 pct，反映「最后一次推进」，但乱序解锁时可能回退。
  - 已在结果里同时返回 `unlockedCount/totalCount/matchedAchievement(含 unlocktime)`，未来切算法无需改契约。

## 真实 BFF 接入的 TODO

- [ ] 服务端实现 `/api/steam/owned` 与 `/api/steam/achievements`：持 `process.env.STEAM_API_KEY` 调 Steam，按 `types.js` 归一化返回。
- [ ] 服务端做 OpenID 2.0 登录拿 `SteamID64`、缓存与限流、私密档案错误透传。
- [ ] 前端加 `HttpSteamClient`（方法签名同 `MockSteamClient`），开发期的 Mock 直接替换。
- [ ] 接 UI（后续任务）：把 `ProgressInput` 的「Steam 成就」Tab 从 mock（`Math.max(game.ach...)`）改为真调 `progressFromAchievements`，并用 `matchedAchievement` 展示「最近解锁」、`error` 时提示档案需公开。

## 局限 / 说明

- fixtures 只用了两款游戏 JSON 里**已有**的 `achievements`（各 10 条剧情成就），未编造数据；其余 3 款游戏的成就映射可后续补齐后再加 fixtures。
- 引擎只认「剧情类成就 → progressPct」映射；收集/挑战类成就不参与进度（符合「流程进度」语义）。
- 全程离线确定性：fixtures 的 `unlocktime` 用固定基准生成，不依赖 `Date.now()`，可重复。
