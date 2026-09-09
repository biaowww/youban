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

1. `scp -r backend/bff offcircle-cloud:/opt/youban/bff`；服务器上建 `/opt/youban/bff/.env`（600）：`GLM_API_KEY`、`COMPANION_STORE=supabase`、`SUPABASE_URL=http://127.0.0.1:8000`、`SERVICE_ROLE_KEY=…`、`GAMES_DIR=/opt/youban/repo/src/data/games`
2. 跑迁移 `backend/supabase/migrations/0002_companion.sql`，然后 `NOTIFY pgrst, 'reload schema';`
3. systemd：`ExecStart=/usr/bin/node --env-file=/opt/youban/bff/.env /opt/youban/bff/server.mjs`，`Restart=always`
4. 端口仍只绑 `127.0.0.1`；个人内测经 `ssh -L 8787:127.0.0.1:8787 offcircle-cloud`，备案后再由 nginx 反代 + TLS

## 已知边界

- **GLM-5 目前只收文本**（官方文档：输入模态=文本）。截图提问要另接视觉模型，走同一 provider 接口加一个实现即可。
- `GLM_MODEL_LITE` 默认 `glm-4.5-flash`，按控制台实际可用模型名改。
