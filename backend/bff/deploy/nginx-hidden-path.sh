#!/usr/bin/env bash
# 游伴攻略簿 · 给线上 youban-companion(127.0.0.1:8787) 挂一个 HTTPS 隐藏路径（个人内测用）。
# 沿用服务器既有模式：-internal 子域 + 不可猜路径，不开新端口、不开新域名。幂等：已存在则只回显地址。
# 用法：在仓库根目录、能 ssh offcircle-cloud 的机器上：
#   ssh offcircle-cloud bash < backend/bff/deploy/nginx-hidden-path.sh
# 回显的 URL 就是内测地址；网页版打开 https://biaowww.github.io/youban/?bff=<URL> 一次即记住。
set -e
F=/etc/nginx/sites-enabled/mcp-connectors
if grep -q "location ^~ /yb-" $F; then
  HEX=$(grep -o "location ^~ /yb-[0-9a-f]*/" $F | head -1 | sed 's#.*/yb-##;s#/##'); echo "already present"
else
  HEX=$(openssl rand -hex 12)
  cp -a $F /root/mcp-connectors.bak.$(date +%s)
  grep -q "zone=yb_companion" $F || sed -i '1i limit_req_zone $binary_remote_addr zone=yb_companion:1m rate=30r/m;' $F
  cat > /tmp/yb-loc.txt <<BLK
    # ---- youban 攻略簿 (hidden path -> loopback youban-companion :8787, SSE; personal beta) ----
    location ^~ /yb-$HEX/ {
        access_log off;
        limit_req zone=yb_companion burst=20 nodelay;
        client_max_body_size 128k;
        proxy_pass http://127.0.0.1:8787/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        chunked_transfer_encoding on;
    }

BLK
  perl -0pi -e 'BEGIN{local $/; open F,"</tmp/yb-loc.txt"; $b=<F>; close F} s/(    location \^~ \/comfy-)/$b$1/' $F
  rm -f /tmp/yb-loc.txt
  nginx -t
  systemctl reload nginx
fi
URL="https://comfyui-internal.offcircle-studios.com/yb-$HEX"
umask 077; echo "$URL" > /opt/youban/companion/PUBLIC_URL.txt; chown youban:youban /opt/youban/companion/PUBLIC_URL.txt
echo "URL=$URL"
echo "health via nginx: $(curl -s $URL/health)"
echo "wrong-path check (expect 404): $(curl -s -o /dev/null -w '%{http_code}' https://comfyui-internal.offcircle-studios.com/yb-000000000000000000000000/health)"
