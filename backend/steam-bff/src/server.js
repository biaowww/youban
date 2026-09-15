/* 游伴 YouBan BFF v0.1 —— 只绑 127.0.0.1（备案未下，公网暴露不做）。
   范围（brief code-youban-2026-07-10，07-17/07-27 批注收窄）：
   关联 Steam 账号 + 拉玩家公开数据；不做成就→游戏进度接通，不做视觉识别。 */
import Fastify from 'fastify';
import { jwtSign, jwtVerify } from './lib/jwt.js';
import { buildLoginUrl, verifyAssertion, parseSteamId, SteamWebApi } from './lib/steam.js';
import { Supabase } from './lib/supabase.js';

const env = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) { console.error(`缺环境变量 ${name}`); process.exit(1); }
  return v;
};

const HOST = env('HOST', '127.0.0.1');
const PORT = Number(env('PORT', '8302'));
const PUBLIC_BASE_URL = env('PUBLIC_BASE_URL', `http://127.0.0.1:${PORT}`);
const SESSION_SECRET = env('SESSION_JWT_SECRET');
const STEAM_API_KEY = process.env.STEAM_API_KEY ?? ''; // 可后补：绑定流程不需要，拉数据需要
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 天
const STATE_TTL = 60 * 10;             // OpenID state 10 分钟

const db = new Supabase(env('SUPABASE_URL', 'http://127.0.0.1:8000'), env('SUPABASE_SERVICE_ROLE_KEY'));
const steamApi = () => {
  if (!STEAM_API_KEY) { const e = new Error('steam_key_missing'); e.code = 'steam_key_missing'; throw e; }
  return new SteamWebApi(STEAM_API_KEY);
};

const app = Fastify({ logger: true, trustProxy: false });

/* Bearer 会话校验（steam/login 额外接受 ?token=，方便系统浏览器跳转） */
function requireUser(req, reply, alsoQueryToken = false) {
  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const token = bearer || (alsoQueryToken ? req.query.token : '');
  const payload = token ? jwtVerify(token, SESSION_SECRET) : null;
  if (!payload?.sub) { reply.code(401).send({ error: 'unauthorized' }); return null; }
  return payload.sub;
}

app.get('/healthz', async () => ({
  ok: true, service: 'youban-bff', version: '0.1.0',
  steamKeyConfigured: Boolean(STEAM_API_KEY), uptimeSec: Math.round(process.uptime()),
}));

/* ── 账号 ── */

// 匿名会话先行：造 auth.users 行 + 发 BFF 会话 JWT
app.post('/api/auth/anon', async (req, reply) => {
  const userId = await db.createAnonUser();
  return { userId, token: jwtSign({ sub: userId }, SESSION_SECRET, SESSION_TTL), expiresInSec: SESSION_TTL };
});

// 微信登录留桩：等 appid/secret（王彪提供）再接 code2session
app.post('/api/auth/wechat', async (req, reply) => {
  reply.code(501).send({ error: 'wechat_not_configured', hint: '桩端点：待 appid/secret 后实现 code2session' });
});

/* ── Steam OpenID 绑定 ── */

app.get('/api/auth/steam/login', async (req, reply) => {
  const userId = requireUser(req, reply, true);
  if (!userId) return;
  const state = jwtSign({ sub: userId, purpose: 'steam_link' }, SESSION_SECRET, STATE_TTL);
  reply.redirect(buildLoginUrl(PUBLIC_BASE_URL, state), 302);
});

app.get('/api/auth/steam/callback', async (req, reply) => {
  const state = jwtVerify(req.query.state ?? '', SESSION_SECRET);
  if (state?.purpose !== 'steam_link') return reply.code(400).send({ error: 'bad_state' });

  const steamId = parseSteamId(req.query);
  if (!steamId) return reply.code(400).send({ error: 'bad_openid_response' });
  if (!(await verifyAssertion(req.query))) return reply.code(401).send({ error: 'openid_verify_failed' });

  await db.upsertSteamLink(state.sub, steamId, { linked_via: 'openid' });
  reply.type('text/html; charset=utf-8').send(
    `<!doctype html><meta charset="utf-8"><title>游伴 · Steam 绑定成功</title>
<body style="font-family:system-ui;display:grid;place-items:center;height:90vh">
<div style="text-align:center"><h2>✅ Steam 绑定成功</h2>
<p>SteamID64：<code>${steamId}</code></p><p>可以关闭本页，回到游伴客户端。</p></div>`);
});

/* ── 玩家公开数据 ── */

app.get('/api/steam/link', async (req, reply) => {
  const userId = requireUser(req, reply);
  if (!userId) return;
  const link = await db.steamLinkOf(userId);
  return { linked: Boolean(link), ...link };
});

app.get('/api/steam/owned', async (req, reply) => {
  const userId = requireUser(req, reply);
  if (!userId) return;
  const link = await db.steamLinkOf(userId);
  if (!link) return reply.code(409).send({ error: 'steam_not_linked' });

  const [owned, catalog] = await Promise.all([
    steamApi().ownedGames(link.platform_uid),
    db.gamesSteamAppIds(),
  ]);
  const byAppId = new Map(catalog.filter((g) => g.steam_app_id).map((g) => [g.steam_app_id, g]));
  return {
    steamId: link.platform_uid,
    totalOwned: owned.length,
    inYouban: owned.filter((g) => byAppId.has(g.appid)).map((g) => ({
      gameId: byAppId.get(g.appid).id, appId: g.appid, name: g.name,
      playtimeForeverMin: g.playtime_forever ?? 0,
      lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null,
    })),
  };
});

/* 玩家该游戏的成就原始数据（公开资料）。
   注意：按 07-17 批注，不在服务端做成就→进度换算；换算契约归客户端 brief。 */
app.get('/api/steam/progress', async (req, reply) => {
  const userId = requireUser(req, reply);
  if (!userId) return;
  const gameId = req.query.gameId;
  if (!gameId) return reply.code(400).send({ error: 'missing_gameId' });

  const [link, game] = await Promise.all([db.steamLinkOf(userId), db.gameById(gameId)]);
  if (!link) return reply.code(409).send({ error: 'steam_not_linked' });
  if (!game) return reply.code(404).send({ error: 'unknown_game' });
  if (!game.steam_app_id) return reply.code(409).send({ error: 'game_has_no_steam_appid' });

  const stats = await steamApi().playerAchievements(link.platform_uid, game.steam_app_id);
  return {
    gameId: game.id, appId: game.steam_app_id, steamId: link.platform_uid,
    achievements: (stats.achievements ?? []).map((a) => ({
      apiname: a.apiname, achieved: a.achieved === 1,
      unlockedAt: a.unlocktime ? new Date(a.unlocktime * 1000).toISOString() : null,
    })),
  };
});

app.setErrorHandler((err, req, reply) => {
  if (err.code === 'steam_key_missing') return reply.code(503).send({ error: 'steam_key_missing', hint: '服务器未配置 STEAM_API_KEY' });
  if (err.status === 403) return reply.code(502).send({ error: 'steam_profile_private_or_forbidden' });
  req.log.error(err);
  reply.code(500).send({ error: 'internal' });
});

app.listen({ host: HOST, port: PORT }).then(() => {
  console.log(`youban-bff listening on ${HOST}:${PORT}（loopback only）`);
});
