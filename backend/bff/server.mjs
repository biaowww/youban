/* ============================================================
   游伴 YouBan · youban-bff · 攻略簿（Companion AI）服务
   ────────────────────────────────────────────────────────────
   零依赖 Node http。密钥只在服务端；客户端永远只见这个 BFF。
   身份：内测期用请求头 x-yb-device（客户端生成的 uuid）；
         后接真账号时改为 Authorization: Bearer <Supabase JWT> → userId。

   端点
     GET    /health
     GET    /api/games                              可用游戏清单（客户端核对）
     GET    /api/companion/:gameId                  这本簿：状态卡 + 近期消息 + 轮数
     POST   /api/companion/:gameId/chat             {message, pct, guard} → SSE 流
     PATCH  /api/companion/:gameId/profile          {notes?, build?, goals?, stuck?} 玩家手动记
     GET    /api/companion/:gameId/export.md?pct=   Markdown 战报
     DELETE /api/companion/:gameId                  清空这本簿

   SSE 事件（每行 data: JSON）
     {"delta":"…"}            增量文本
     {"done":true,"turns":n,"cardRefreshing":bool}
     {"error":"…"}
   ============================================================ */
import http from 'node:http';
import { createHash } from 'node:crypto';
import { config } from './config.mjs';
import { createAuth, AuthError } from './lib/auth.mjs';
import { createSupabaseProgress, createMemoryProgress } from './lib/progress.mjs';
import { loadGames, listGames } from './lib/games.mjs';
import { buildMessages } from './lib/promptBuilder.mjs';
import { updateCardWithLLM, mergeCard } from './lib/profile.mjs';
import { renderReport } from './lib/report.mjs';
import { createQuota } from './lib/quota.mjs';
import { getProvider } from './lib/providers/index.mjs';
import { getStore } from './lib/store/index.mjs';

const games = loadGames(config.gamesDir);
const provider = getProvider(config);
const store = getStore(config);
const auth = createAuth({
  url: config.supabase.url, anonKey: config.auth.anonKey, serviceKey: config.supabase.serviceKey,
  jwtSecret: config.auth.jwtSecret, inviteCodes: config.auth.inviteCodes, emailDomain: config.auth.emailDomain,
});
const progress = (config.store === 'supabase')
  ? createSupabaseProgress({ url: config.supabase.url, serviceKey: config.supabase.serviceKey })
  : createMemoryProgress();
/* 内容清单：每款游戏的内容哈希（客户端据此判断本地缓存是否过期） */
const contentHash = new Map([...games].map(([id, g]) => [id, createHash('sha256').update(JSON.stringify(g)).digest('hex').slice(0, 16)]));
console.log(`[bff] games=${games.size} provider=${provider.name} store=${store.name} chat=${config.glm.modelChat} lite=${config.glm.modelLite} auth=${auth.enabled ? 'on' : 'off'}${auth.enabled ? (auth.inviteRequired ? '(invite)' : '(open)') : ''}`);

/* ───────── 小工具 ───────── */
const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};
const text = (res, code, body, type = 'text/plain') => {
  res.writeHead(code, { 'Content-Type': `${type}; charset=utf-8` });
  res.end(body);
};
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-yb-device, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
}
const bearerOf = (req) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
async function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}
/* 身份：带了有效登录 token → 账号（userId）；没带 → 设备号（匿名）。
   带了 token 但无效 / 过期 → 返回 {expired:true}，让客户端去续期，而不是悄悄降级成设备身份
   （否则会出现"明明登录了，聊天却记到另一本簿里"）。 */
function identityOf(req, url) {
  const token = bearerOf(req);
  if (token) {
    const u = auth.verify(token);
    return u ? { userId: u.userId, account: u.account } : { expired: true };
  }
  const dev = req.headers['x-yb-device'] || url.searchParams.get('device');
  if (!dev || String(dev).length < 6) return null;
  return { deviceId: String(dev).slice(0, 80) };
}
const deviceOf = (req) => { const d = req.headers['x-yb-device']; return d && String(d).length >= 6 ? String(d).slice(0, 80) : null; };
const clampPct = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; };
const toBool = (v, d = true) => (v === undefined || v === null ? d : !(v === false || v === 'false' || v === '0' || v === 0));

/* ───────── 状态卡刷新（fire-and-forget） ───────── */
const refreshing = new Set();
async function maybeRefreshCard({ sessionId, game, turns }) {
  if (turns % config.profileEveryTurns !== 0 || refreshing.has(sessionId)) return false;
  refreshing.add(sessionId);
  (async () => {
    try {
      const full = await store.getFull(sessionId);
      const recent = full.messages.slice(-(config.profileEveryTurns * 2 + 2));
      const { card, changed } = await updateCardWithLLM({ provider, model: config.glm.modelLite, card: full.card, recent, game, turn: turns });
      if (changed) await store.saveCard(sessionId, card);
    } catch (e) {
      console.warn('[bff] 状态卡刷新异常：', e.message);
    } finally { refreshing.delete(sessionId); }
  })();
  return true;
}

const quota = createQuota({ dailyTurns: config.dailyTurns });

/* ───────── 路由 ───────── */
async function handle(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/health') return json(res, 200, { ok: true, provider: provider.name, store: store.name, games: games.size, auth: auth.enabled, invite: auth.inviteRequired });
  if (p === '/api/games' && req.method === 'GET') return json(res, 200, listGames(games));

  /* ── 内容分发：清单（id + 哈希）与单款全文；客户端按哈希增量更新本地缓存 ── */
  if (p === '/api/content/manifest' && req.method === 'GET') {
    return json(res, 200, { games: [...contentHash].map(([id, hash]) => ({ id, hash })) });
  }
  const cm = p.match(/^\/api\/content\/games\/([a-zA-Z0-9_-]+)$/);
  if (cm && req.method === 'GET') {
    const g = games.get(cm[1]);
    if (!g) return json(res, 404, { error: `未知游戏 ${cm[1]}` });
    res.setHeader('ETag', `"${contentHash.get(cm[1])}"`);
    return json(res, 200, g);
  }

  /* ── 账号 ── */
  if (p.startsWith('/api/auth/') && req.method === 'POST') {
    const body = await readBody(req);
    if (p === '/api/auth/signup') return json(res, 200, await auth.signup(body));
    if (p === '/api/auth/login') return json(res, 200, await auth.login(body));
    if (p === '/api/auth/refresh') return json(res, 200, await auth.refresh(body));
    return json(res, 404, { error: 'not found' });
  }

  /* ── 我的（须登录） ── */
  if (p.startsWith('/api/me')) {
    const me = auth.verify(bearerOf(req));
    if (!me) return json(res, 401, { error: '未登录或登录已过期', code: 'unauthorized' });
    if (p === '/api/me' && req.method === 'GET') return json(res, 200, { id: me.userId, account: me.account });
    if (p === '/api/me/progress' && req.method === 'GET') return json(res, 200, { progress: await progress.list(me.userId) });
    const pm = p.match(/^\/api\/me\/progress\/([a-zA-Z0-9_-]+)$/);
    if (pm && req.method === 'PUT') {
      if (!games.has(pm[1])) return json(res, 404, { error: `未知游戏 ${pm[1]}` });
      const body = await readBody(req);
      return json(res, 200, await progress.upsert(me.userId, pm[1], body.pct, body.source));
    }
    if (p === '/api/me/claim-device' && req.method === 'POST') {
      const dev = deviceOf(req);
      if (!dev) return json(res, 400, { error: '缺少 x-yb-device' });
      return json(res, 200, await store.claimDevice(me.userId, dev));
    }
    return json(res, 404, { error: 'not found' });
  }

  const m = p.match(/^\/api\/companion\/([a-zA-Z0-9_-]+)(?:\/(chat|profile|export\.md))?$/);
  if (!m) return json(res, 404, { error: 'not found' });
  const [, gameId, sub] = m;
  const game = games.get(gameId);
  if (!game) return json(res, 404, { error: `未知游戏 ${gameId}` });
  const identity = identityOf(req, url);
  if (!identity) return json(res, 400, { error: '缺少身份（登录 token 或 x-yb-device）' });
  if (identity.expired) return json(res, 401, { error: '登录已过期', code: 'unauthorized' });

  /* GET 这本簿 */
  if (!sub && req.method === 'GET') {
    const s = await store.openSession(identity, gameId);
    return json(res, 200, { gameId, card: s.card, turns: s.turns, messages: s.messages });
  }
  /* DELETE 清空 */
  if (!sub && req.method === 'DELETE') {
    const s = await store.openSession(identity, gameId);
    await store.resetSession(s.sessionId);
    return json(res, 200, { ok: true });
  }
  /* PATCH 玩家手动记 */
  if (sub === 'profile' && req.method === 'PATCH') {
    const body = await readBody(req);
    const s = await store.openSession(identity, gameId);
    const card = mergeCard(s.card, body, s.turns);
    await store.saveCard(s.sessionId, card);
    return json(res, 200, { card });
  }
  /* GET 战报 */
  if (sub === 'export.md' && req.method === 'GET') {
    const s = await store.openSession(identity, gameId);
    const md = renderReport({ game, pct: clampPct(url.searchParams.get('pct')), card: s.card, turns: s.turns, guard: toBool(url.searchParams.get('guard')) });
    /* HTTP 头只能 ASCII：中文文件名走 RFC 5987 的 filename*，另给 ASCII 兜底 */
    const fname = encodeURIComponent(`${game.short || gameId}-战报.md`);
    res.setHeader('Content-Disposition', `attachment; filename="${gameId}-report.md"; filename*=UTF-8''${fname}`);
    return text(res, 200, md, 'text/markdown');
  }
  /* POST 对话（SSE） */
  if (sub === 'chat' && req.method === 'POST') {
    const body = await readBody(req);
    const message = String(body.message || '').trim();
    if (!message) return json(res, 400, { error: 'message 为空' });
    if (message.length > config.maxMessageChars) return json(res, 400, { error: `message 超长（>${config.maxMessageChars}）` });
    const pct = clampPct(body.pct);
    const guard = toBool(body.guard);
    const q = quota.take(identity.userId ? `u:${identity.userId}` : `d:${identity.deviceId}`);
    if (!q.ok) return json(res, 429, { error: `今天的 ${q.limit} 轮已用完，明天再来。（内测期每日上限）` });

    const s = await store.openSession(identity, gameId);
    const messages = buildMessages({
      game, pct, guard, card: s.card, history: s.messages, userMessage: message,
      historyMessages: config.historyMessages, briefMaxChars: config.briefMaxChars,
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
    });
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    const ac = new AbortController();
    req.on('close', () => ac.abort());

    let full = '';
    try {
      for await (const delta of provider.stream({ model: config.glm.modelChat, messages, signal: ac.signal })) {
        full += delta;
        send({ delta });
      }
    } catch (e) {
      if (!ac.signal.aborted) send({ error: e.message });
    }
    if (ac.signal.aborted) return res.end();

    const turns = await store.appendMessages(s.sessionId, [
      { role: 'user', content: message, pct },
      { role: 'assistant', content: full, pct },
    ]);
    const cardRefreshing = await maybeRefreshCard({ sessionId: s.sessionId, game, turns });
    send({ done: true, turns, cardRefreshing });
    return res.end();
  }

  return json(res, 405, { error: 'method not allowed' });
}

http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    /* 业务性错误（账号 / 参数）按其状态码回，不进错误日志；URL 里可能带 token，不整条打印 */
    if (e instanceof AuthError) { if (!res.headersSent) json(res, e.status, { error: e.message, code: e.code }); else res.end(); return; }
    console.error('[bff]', req.method, String(req.url).split('?')[0], e);
    if (!res.headersSent) json(res, 500, { error: '服务器开小差了，稍后再试' });
    else res.end();
  });
}).listen(config.port, '127.0.0.1', () => {
  console.log(`[bff] listening http://127.0.0.1:${config.port}`);
});
