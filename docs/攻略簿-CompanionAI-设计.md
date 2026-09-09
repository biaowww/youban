# 攻略簿（Companion AI）· 设计与取舍

**状态：v1 后端已落地（2026-09-09）｜客户端待接（阶段 2）｜线上部署待办（阶段 3）**

## 一、这是什么

一款游戏一本私有攻略簿：玩家边玩边问，助手知道他在哪、刚过了谁、下一个是谁，记得他的流派、道具、卡点和做过的选择，且**不剧透**。源自王彪用 Gemini 长程对话通关《血源诅咒》的体验——把"单一游戏为单元的玩家游玩记忆"做成产品功能，未来可做付费定制。

## 二、为什么"接外部 API"就够、不做 NotebookLM

NotebookLM = 对用户上传资料做 RAG 再聊天。我们的语料不是资料堆，是**已核实、按进度百分比索引的结构化数据**（17 款游戏的章节 / Boss / 入场点 / 主角历程）。真正的产品价值在模型之外：

1. **按进度锚定**——玩家 61%，助手就知道在第四回盘丝岭、刚过紫蛛娘娘、下一个百眼魔君；
2. **防剧透硬边界**——`guard` 开时越界内容**根本不进 prompt**，不靠模型自觉；
3. **一款游戏一本簿**——持久记忆 + 可导出战报。

三者都是围绕任意 LLM 的应用层逻辑。模型可换（GLM → Claude / Gemini 只是换一个 provider 文件），**付费分层也因此是一个路由参数**：免费走 Flash，Premium 路由更强模型。

## 三、对 Gemini 初步规划的取舍

| Gemini 提议 | 处理 | 原因 |
|---|---|---|
| 不全量追加历史，用「动态状态卡」 | 采纳（核心） | 长程卡顿根源 |
| `GameProfile` 记 location / defeated_bosses | 改造 | 这两项由 `pct` + 游戏数据推导，**以玩家滑块为准，不让模型改**；卡片只记模型才知道的：build / 道具 / 目标 / 卡点 / 决定 / 备注 |
| 异步 Worker 每 3 轮更新 | 简化 | 个人内测规模：同请求内 fire-and-forget 调轻模型即可，零基础设施 |
| Prompt = 人设 + 卡片 + 最近 5 轮 | 补一块 | 缺**游戏简报 + 剧透边界**——这是我们独有的数据 |
| Prisma / SQL | 不用 ORM | 照 `0001_init.sql` 写原生迁移 `0002_companion.sql` |
| 流式 chat + export 战报 | 采纳 | 成为 BFF 前两个真实端点 |
| MCP 扩展位 | 路线图 | v1 不做 |

## 四、架构

```
客户端（Electron / Web）── fetch + SSE，x-yb-device ──▶ youban-bff（Node，零依赖）
                                                          ├─ gameBrief(game, pct, guard)   ← src/data/games JSON
                                                          ├─ promptBuilder：人设 + 简报 + 状态卡 + 最近 N 条
                                                          ├─ profile：每 N 轮轻模型增量合并（不碰进度）
                                                          ├─ providers/：glm | mock | (anthropic…)
                                                          └─ store/：file（本地）| supabase（线上，service_role）
```

代码：`backend/bff/`；表：`backend/supabase/migrations/0002_companion.sql`；单测：`src/test/companion.test.js`。

## 五、Prompt 管线（一次请求）

1. `store.openSession(身份, gameId)` → 状态卡 + 近 50 条
2. `buildGameBrief(game, pct, guard)` → ≈2–4KB：游戏头 / 当前章节剧情与目标 / 已走过章节 / 已解锁能力 / 已经历 Boss / **下一个 Boss（名字 + 打法，不含剧情）** / 入场点 / 剧透边界声明。`guard=false` 才列后续 Boss。
3. `buildMessages()` → `[system: 人设+规则+简报+状态卡] + 最近 10 条 + 本轮提问`
4. 流式回传；落库 user/assistant 两条；`turns % 3 === 0` 时后台刷新状态卡
5. 状态卡合并是**确定性**的（去重、限长、`doneGoals`/`resolvedStuck` 删除项、goals 与 stuck 互斥），模型只出增量 JSON，解析失败就保留旧卡——记忆整理永远不拖垮对话

## 六、身份与存储

- 内测期：客户端生成 uuid 放 `x-yb-device`；`companion_sessions.device_id`。
- 接真账号：`Authorization: Bearer <Supabase JWT>` → `user_id`；只改 `server.mjs` 的 `identityOf()`。
- `device_id` 行只由 BFF 以 service_role 写，anon 永远读不到（RLS 只对 user_id 行开放）。
- 本地开发 `COMPANION_STORE=file`（JSON 到 `backend/bff/data/`，已 gitignore）；线上 `supabase`。

## 七、阶段

- **阶段 1（已完成）**：BFF + 记忆内核，Mock 与 GLM 双 provider，19 个单测，本机全链路跑通。
- **阶段 2**：v10 新增「攻略簿」Tab（一期）+ 浮动按钮（二期）：流式聊天、状态卡视图、快捷提问、导出；无服务器（GitHub Pages）时优雅降级。
- **阶段 3**：offcircle-cloud systemd + `.env`，跑 `0002` 迁移，先经 SSH 隧道个人内测。
- **阶段 4**：截图提问（**GLM-5 只收文本**，需另接视觉模型）、steam_track 时长入卡、Premium 模型路由、MCP / 外部知识源。

## 八、已定的产品红线（延续平台中立化 v2）

- 进度以客户端为准，助手只读。
- 防剧透在数据层执行，而非提示词层。
- 不编造：简报只用核实过的游戏数据；模型规则写明"不知道就说不知道"。
- 密钥只在服务端。
