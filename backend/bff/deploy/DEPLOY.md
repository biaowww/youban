# youban-companion · 上线清单（offcircle-cloud）

> **现场事实（2026-09-16 预检）**：服务器上已有一个在跑的 `youban-bff`（Fastify，`/opt/youban/bff`，端口 8302，systemd `youban-bff.service`，用户 `youban`，功能 = Steam 绑定 + 玩家公开数据，代码**不在 git 里**）。攻略簿**不动它**，作为独立服务并存：目录 `/opt/youban/companion`、单元 `youban-companion`、端口 8787（客户端默认）。将来合并再议。
> Node 20.20 可跑（systemd 用 EnvironmentFile 注入 env，不依赖 `--env-file`）。全程端口只绑 `127.0.0.1`。

## 1. 同步文件（本机 → 服务器）

```bash
# 在仓库根执行
scp -r backend/bff offcircle-cloud:/opt/youban/companion-new
scp -r src/data/games offcircle-cloud:/opt/youban/repo/src/data/games-new       # 17 款
scp backend/supabase/migrations/0002_companion.sql offcircle-cloud:/opt/youban/repo/backend/supabase/migrations/
ssh offcircle-cloud '
  rm -rf /opt/youban/companion && mv /opt/youban/companion-new /opt/youban/companion
  rm -rf /opt/youban/repo/src/data/games && mv /opt/youban/repo/src/data/games-new /opt/youban/repo/src/data/games
  rm -rf /opt/youban/companion/data /opt/youban/companion/.env
  chown -R youban:youban /opt/youban/companion /opt/youban/repo/src/data/games'
```

## 2. 建表（一次）

```bash
ssh offcircle-cloud '
  docker exec -i supabase-db psql -U postgres -d postgres < /opt/youban/repo/backend/supabase/migrations/0002_companion.sql
  docker exec supabase-db psql -U postgres -c "NOTIFY pgrst, '"'"'reload schema'"'"';"'
```

## 3. `.env`（600，属主 youban）

除 `GLM_API_KEY` 外全部可在服务器上机器生成；**key 那一行由王彪本人填**：

```bash
ssh offcircle-cloud '
  SRK=$(grep "^SERVICE_ROLE_KEY=" /opt/youban/supabase/.env | cut -d= -f2-)
  install -o youban -g youban -m 600 /dev/null /opt/youban/companion/.env
  cat > /opt/youban/companion/.env <<EOF
PORT=8787
PROVIDER=glm
GLM_API_KEY=
GLM_MODEL_CHAT=glm-5.3
GLM_MODEL_LITE=glm-4.7-flash
GLM_REASONING_EFFORT=low
COMPANION_STORE=supabase
SUPABASE_URL=http://127.0.0.1:8000
SERVICE_ROLE_KEY=$SRK
GAMES_DIR=/opt/youban/repo/src/data/games
EOF'
# 王彪：填 key（在 Mac 的 session 或任意能 ssh 的地方）
ssh offcircle-cloud "sed -i 's|^GLM_API_KEY=.*|GLM_API_KEY=<你的key>|' /opt/youban/companion/.env && systemctl restart youban-companion"
```

key 为空时服务照样起，`provider` 自动回退 mock（日志会提示），填上 key 重启即切真 GLM。

## 4. systemd

```bash
ssh offcircle-cloud '
  cp /opt/youban/companion/deploy/youban-companion.service /etc/systemd/system/
  systemctl daemon-reload && systemctl enable --now youban-companion
  systemctl --no-pager status youban-companion | head -5
  curl -s http://127.0.0.1:8787/health'
```

## 5. 本机接上（个人内测）

```bash
ssh -N -L 8787:127.0.0.1:8787 offcircle-cloud      # 开着不关
```

客户端默认找 `http://127.0.0.1:8787`，隧道一开，Electron / 本地 preview 的「攻略簿」自动连上线上服务，簿存进线上 Supabase。

## 6. 验收

```bash
ssh offcircle-cloud '
  curl -s -H "x-yb-device: smoke" http://127.0.0.1:8787/api/companion/black_myth_wukong | head -c 300; echo
  docker exec supabase-db psql -U postgres -c "select id, device_id, game_id, turns from companion_sessions;"
  journalctl -u youban-companion -n 20 --no-pager'
```

## 回滚

`systemctl disable --now youban-companion`；表可保留；`youban-bff`（8302）全程未动。
