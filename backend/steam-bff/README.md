# youban-bff

游伴 BFF v0.1 —— **只绑 127.0.0.1:8302**（备案未下，一切公网暴露不做；调试走 SSH 隧道）。

票据：brief `code-youban-2026-07-10`。范围（07-17 / 07-27 批注收窄）：**关联 Steam 账号 + 拉玩家公开数据**；不做成就→进度换算（归客户端 brief `code-youban-2026-07-27`）、不做截图视觉识别。

## 端点

| 端点 | 鉴权 | 说明 |
|---|---|---|
| `GET /healthz` | 无 | 存活 + steamKey 配置状态 |
| `POST /api/auth/anon` | 无 | 匿名会话先行：GoTrue admin 造 `auth.users` 行，返回 BFF JWT（30 天） |
| `POST /api/auth/wechat` | 无 | **桩**（501），等 appid/secret 接 code2session |
| `GET /api/auth/steam/login` | Bearer 或 `?token=` | 302 到 Steam OpenID（state=10 分钟签名 JWT） |
| `GET /api/auth/steam/callback` | state | 验签（check_authentication）→ upsert `user_platform_links` → 成功页 |
| `GET /api/steam/link` | Bearer | 当前绑定状态 |
| `GET /api/steam/owned` | Bearer | GetOwnedGames ∩ `games` 表（返回 gameId / 时长 / 最后游玩） |
| `GET /api/steam/progress?gameId=` | Bearer | 该游戏玩家成就**原始数据**（不做进度换算） |

错误约定：`401 unauthorized` / `409 steam_not_linked` / `503 steam_key_missing` / `502 steam_profile_private_or_forbidden`。

## 运维

```bash
# 部署（root）
cp youban-bff.service /etc/systemd/system/ && systemctl daemon-reload
systemctl enable --now youban-bff
journalctl -u youban-bff -f
```

- 配置：`.env`（600，属主 youban），模板见 `.env.example`。`SUPABASE_SERVICE_ROLE_KEY` 取自 `/opt/youban/supabase/.env`。
- **STEAM_API_KEY 未配时**：绑定流程可用，`owned/progress` 返回 503。
- Mac 调试隧道：`ssh -L 8302:127.0.0.1:8302 <server>`，浏览器走本机 8302 完成 Steam 跳转。
- 测试：`npm test`（纯函数单测，零网络）。

## 设计要点

- 会话 = BFF 自签 HS256 JWT（零依赖实现 `src/lib/jwt.js`），不开 GoTrue 全局匿名登录（不动共享 Supabase 配置）。
- OpenID 防伪造：`op_endpoint` 白名单 + `claimed_id` 严格正则 + stateless `check_authentication` 回验。
- DB 全走 kong→PostgREST，service role 只在本进程 env。
