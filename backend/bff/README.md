# youban-bff · 攻略簿（Companion AI）

> 设计背景与取舍见 `docs/攻略簿-CompanionAI-设计.md`。本页是**怎么跑 + 接口速查**。

零依赖 Node（≥ 22.9）。密钥只在这里；客户端永远只见 BFF。

## 本地跑

```bash
cd backend/bff
cp .env.example .env          # 填 GLM_API_KEY；没 key 就 PROVIDER=mock
npm run dev                   # http://127.0.0.1:8787（--watch 热重启）
```

`PROVIDER=mock` 时不出网、回复是本地假话，但整条管线（简报 / 状态卡 / 流式 / 存储）都是真的，够跑 UI。

## 接口

身份：请求头 `x-yb-device: <客户端 uuid>`（内测期）；接真账号后改 `Authorization: Bearer <JWT>`，只动 `server.mjs` 的 `identityOf()`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | provider / store / 游戏数 |
| GET | `/api/games` | 可用游戏清单（id / short / platforms） |
| GET | `/api/companion/:gameId` | 这本簿：`{card, turns, messages(近 50)}` |
| POST | `/api/companion/:gameId/chat` | `{message, pct, guard}` → **SSE** |
| PATCH | `/api/companion/:gameId/profile` | 玩家手动记：`{build?, keyItems?, goals?, stuck?, decisions?, notes?}` |
| GET | `/api/companion/:gameId/export.md?pct=61` | Markdown 战报（下载） |
| DELETE | `/api/companion/:gameId` | 清空这本簿 |

SSE 每行 `data: <JSON>`：`{"delta":"…"}` 增量 → `{"done":true,"turns":n,"cardRefreshing":bool}` 收尾；出错 `{"error":"…"}`。

## 记忆是怎么做的（一句话版）

不做全量历史追加。prompt = **人设** + **游戏简报**（按玩家 `pct` 从游戏 JSON 切出当前章节 / 已过 Boss / 下一个 Boss，`guard` 开时越界内容根本不进 prompt）+ **状态卡**（build / 道具 / 目标 / 卡点 / 决定 / 备注，每 `PROFILE_EVERY_TURNS` 轮由轻量模型增量合并）+ **最近 N 条**。玩家进度永远以客户端为准，模型不改它。

## 模块

```
server.mjs            路由 + SSE；身份解析在 identityOf()
config.mjs            全部 env
lib/gameBrief.mjs     纯函数：游戏 JSON + pct + guard → 简报（防剧透边界在此执行）
lib/promptBuilder.mjs 纯函数：拼 messages
lib/profile.mjs       状态卡 schema / merge / 解析 / 轻模型刷新
lib/report.mjs        纯函数：战报 Markdown
lib/providers/        glm（OpenAI 兼容流式）| mock；加厂商 = 加一个同形文件
lib/store/            file（本地 JSON）| supabase（service_role 经 REST）
```

纯函数都有单测：`cd src && npx vitest run test/companion.test.js`。

## 上线（offcircle-cloud）

按 `deploy/DEPLOY.md` 走。要点：服务器上已有一个 **`youban-bff`（Fastify，8302，Steam 绑定，7 月产物，不在 git）**，攻略簿**不动它**、作为独立服务 `youban-companion` 部署到 `/opt/youban/companion`、端口 8787、用户 `youban`、只绑 `127.0.0.1`；个人内测经 `ssh -L 8787:127.0.0.1:8787 offcircle-cloud`，备案后再 nginx 反代 + TLS。Node 20 可跑（systemd 用 `EnvironmentFile`，不依赖 `--env-file`）。

## 已知边界

- **GLM-5.x 只收文本**（官方文档：输入模态=文本）。截图提问要另接视觉模型（GLM-5V 系），走同一 provider 接口加一个实现即可。
- **GLM-5.x 的 thinking 不可关闭**，`reasoning_effort` 默认 `max`——对话场景必须显式 `low`（已默认），否则每句又慢又贵；4.x 模型不认这两个参数，provider 按模型名前缀决定是否附带。
- 模型 id（2026-09-16 核实）：对话 `glm-5.3`，便宜档 `glm-4.7-flash`（官方免费）。
