# backend · 游伴线上化

> 设计文档见 `docs/后端v1-架构与数据库设计.md`。本页是**部署实况 + 运维速查**。

## 部署实况（2026-07-01 · offcircle-cloud）

| 项 | 值 |
|---|---|
| 服务器 | 腾讯云 `ap-beijing`（**大陆，可出备案授权码**）· S5.LARGE8 4核8G · Ubuntu 24.04 |
| Supabase | 自托管 docker compose，**11 服务全 healthy**（Postgres 17 / GoTrue / PostgREST / Kong / Studio / Storage / Realtime / Supavisor …） |
| 目录 | compose+密钥：`/opt/youban/supabase`（`.env` 600，密钥只在服务器）；迁移/seed/数据镜像：`/opt/youban/repo` |
| 数据 | `0001_init.sql` 已执行；**6 款游戏已 seed**，anon REST 可读，RLS 验证过（anon 写 → 401） |
| 暴露面 | **全部端口绑 127.0.0.1，公网零暴露**（Kong 8000/8443、PG 5432、Pooler 6543）；备案下域名后再由 nginx 反代 + TLS |

## 开发期访问（SSH 隧道）

```bash
ssh -L 8000:127.0.0.1:8000 offcircle-cloud     # 之后本机 http://localhost:8000
# REST：  GET http://localhost:8000/rest/v1/games?select=data  （header: apikey=<ANON_KEY>）
# Studio：浏览器开 http://localhost:8000（basic auth：youban / 服务器 .env 的 DASHBOARD_PASSWORD）
```

密钥查看（仅服务器上）：`grep -E "^(ANON_KEY|SERVICE_ROLE_KEY|DASHBOARD_PASSWORD)=" /opt/youban/supabase/.env`

## 常用运维

```bash
cd /opt/youban/supabase
docker compose ps                     # 状态
docker compose logs -f <service>      # 日志
docker compose restart <service>      # 重启单服务
```

**内容更新流**：改仓库 `src/data/games/*.json`（过 validate/test）→ scp 到 `/opt/youban/repo/src/data/games/` → 服务器上：

```bash
cd /opt/youban/supabase
export SUPABASE_URL=http://127.0.0.1:8000 SERVICE_ROLE_KEY=$(grep "^SERVICE_ROLE_KEY=" .env | cut -d= -f2)
node /opt/youban/repo/backend/scripts/seed-games.mjs   # 哈希比对幂等，内容变了才 upsert 并 version+1
```

## 已知坑

- **PostgREST schema 缓存**：新建/改表后要 `docker exec supabase-db psql -U postgres -c "NOTIFY pgrst, 'reload schema';"`，否则 REST 报 PGRST205。
- **jsonb 键序**：jsonb 存储会重排键序，seed 的哈希比对已做键序无关规范化（canon）。
- **服务器拉 GitHub 会抽风**：走本机代理隧道 `git -c http.proxy=http://127.0.0.1:10808 …`（隧道依赖 Mac 会话在线）；Docker 镜像走 `mirror.ccs.tencentyun.com` 不受影响。

## 下一步

- [x] `youban-bff` 骨架已立（`backend/bff/`，零依赖 Node，2026-09-09）——首批端点是**攻略簿 Companion AI**（`/api/companion/*`，SSE 流式 + 状态卡记忆），见 `backend/bff/README.md`
- [ ] BFF 补 `/api/auth/wechat`、`/api/auth/steam/*`、`/api/steam/*`（复用 `src/services/steam/`）
- [ ] 服务器部署 bff（systemd + .env）+ 跑 `0002_companion.sql`
- [ ] 客户端 `loadRawGames()` 加线上源（anon key + version 缓存 + 离线回落）
- [ ] 备案下来后：nginx 挂 `api.<域名>` + certbot TLS，替换开发期隧道
