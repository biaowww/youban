# youban-bff · 上线清单（offcircle-cloud）

> 前提：服务器已跑自托管 Supabase（`/opt/youban/supabase`），仓库镜像在 `/opt/youban/repo`。
> 全程端口只绑 `127.0.0.1`；个人内测走 SSH 隧道，备案后再 nginx + TLS。

## 0. 本机 → 服务器（一次）

```bash
# 仓库镜像同步（含 src/data/games 与 backend/bff）
ssh offcircle-cloud "cd /opt/youban/repo && git -c http.proxy=http://127.0.0.1:10808 pull"   # 代理依赖 Mac 隧道；不通就 scp
# 或直接推目录：
scp -r backend/bff offcircle-cloud:/opt/youban/bff-new && ssh offcircle-cloud "rm -rf /opt/youban/bff && mv /opt/youban/bff-new /opt/youban/bff"
```

## 1. Node ≥ 22.9（首次）

```bash
node -v || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs)
```

## 2. 建表（一次）

```bash
docker exec -i supabase-db psql -U postgres -d postgres < /opt/youban/repo/backend/supabase/migrations/0002_companion.sql
docker exec supabase-db psql -U postgres -c "NOTIFY pgrst, 'reload schema';"
```

## 3. `.env`（600，密钥只在这里；**由王彪本人在服务器上填 key**）

```bash
install -m 600 /dev/null /opt/youban/bff/.env
cat > /opt/youban/bff/.env <<'EOF'
PORT=8787
PROVIDER=glm
GLM_API_KEY=__在服务器上手填__
GLM_MODEL_CHAT=glm-5
GLM_MODEL_LITE=glm-4.5-flash
COMPANION_STORE=supabase
SUPABASE_URL=http://127.0.0.1:8000
SERVICE_ROLE_KEY=__grep 自 /opt/youban/supabase/.env__
GAMES_DIR=/opt/youban/repo/src/data/games
EOF
# SERVICE_ROLE_KEY 可直接从 supabase .env 取：
sed -i "s|__grep 自 /opt/youban/supabase/.env__|$(grep '^SERVICE_ROLE_KEY=' /opt/youban/supabase/.env | cut -d= -f2)|" /opt/youban/bff/.env
```

## 4. systemd

```bash
cp /opt/youban/bff/deploy/youban-bff.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now youban-bff
systemctl status youban-bff --no-pager && curl -s http://127.0.0.1:8787/health
```

## 5. 本机接上（个人内测）

```bash
ssh -N -L 8787:127.0.0.1:8787 offcircle-cloud      # 开着不关
```

客户端默认就找 `http://127.0.0.1:8787`，隧道一开，Electron / 本地 preview 里的「攻略簿」自动连上线上服务，簿存进线上 Supabase。

## 6. 验收

```bash
# 服务器上
curl -s -H "x-yb-device: smoke" http://127.0.0.1:8787/api/companion/black_myth_wukong
docker exec supabase-db psql -U postgres -c "select id, device_id, game_id, turns from companion_sessions;"
journalctl -u youban-bff -n 30 --no-pager
```

## 回滚

`systemctl stop youban-bff`；表可保留（不影响其它服务）。
