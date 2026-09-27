#!/usr/bin/env bash
# 游伴攻略簿 · 给线上 youban-companion(127.0.0.1:8787) 开一个固定的 HTTPS 公网入口（零配置即开即用）。
#   入口：https://comfyui-internal.offcircle-studios.com/youban-api/  ← 网页/客户端里写死的默认地址
#   借用服务器已有 TLS 子域，不开新端口、不加 DNS、不签新证书；换独立子域时只需改客户端一个常量。
#   护栏：nginx 限流 30r/m/IP + BFF 每设备每日轮数上限（COMPANION_DAILY_TURNS）。幂等，可重复跑。
# 用法（能 ssh offcircle-cloud 的机器、仓库根目录）：
#   ssh offcircle-cloud bash < backend/bff/deploy/nginx-hidden-path.sh
set -e
F=/etc/nginx/sites-enabled/mcp-connectors
URL="https://comfyui-internal.offcircle-studios.com/youban-api"
if grep -q "location ^~ /youban-api/" "$F"; then
  echo "already present"
else
  cp -a "$F" "/root/mcp-connectors.bak.$(date +%s)"
  grep -q "zone=yb_companion" "$F" || sed -i '1i limit_req_zone $binary_remote_addr zone=yb_companion:1m rate=30r/m;' "$F"
  cat > /tmp/yb-loc.txt <<'BLK'
    # ---- youban 攻略簿 (fixed public path -> loopback youban-companion :8787, SSE; beta) ----
    location ^~ /youban-api/ {
        limit_req zone=yb_companion burst=20 nodelay;
        client_max_body_size 128k;
        proxy_pass http://127.0.0.1:8787/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        chunked_transfer_encoding on;
    }

BLK
  perl -0pi -e 'BEGIN{local $/; open F,"</tmp/yb-loc.txt"; $b=<F>; close F} s/(    location \^~ \/comfy-)/$b$1/' "$F"
  rm -f /tmp/yb-loc.txt
  nginx -t
  systemctl reload nginx
fi
echo "URL=$URL"
echo "health via nginx: $(curl -s "$URL/health")"
