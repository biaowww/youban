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
import { config } from './config.mjs';
import { loadGames, listGames } from './lib/games.mjs';
import { buildMessages } from './lib/promptBuilder.mjs';
import { updateCardWithLLM, mergeCard } from './lib/profile.mjs';
import { renderReport } from './lib/report.mjs';
import { getProvider } from './lib/providers/index.mjs';
import { getStore } from './lib/store/index.mjs';

const games = loadGames(config.gamesDir);
const provider = getProvider(config);
const store = getStore(config);
console.log(`[bff] games=${games.size} provider=${provider.name} store=${store.name} chat=${config.glm.modelChat} lite=${config.glm.modelLite}`);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
}
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
function identityOf(req, url) {
  /* v1：设备 ID。后续：解 JWT 得 userId（放这里，其余代码不动） */
  const dev = req.headers['x-yb-device'] || url.searchParams.get('device');
  if (!dev || String(dev).length < 6) return null;
  return { deviceId: String(dev).slice(0, 80) };
}
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

/* ───────── 路由 ───────── */
async function handle(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/health') return json(res, 200, { ok: true, provider: provider.name, store: store.name, games: games.size });
  if (p === '/api/games' && req.method === 'GET') return json(res, 200, listGames(games));

  const m = p.match(/^\/api\/companion\/([a-zA-Z0-9_-]+)(?:\/(chat|profile|export\.md))?$/);
  if (!m) return json(res, 404, { error: 'not found' });
  const [, gameId, sub] = m;
  const game = games.get(gameId);
  if (!game) return json(res, 404, { error: `未知游戏 ${gameId}` });
  const identity = identityOf(req, url);
  if (!identity) return json(res, 400, { error: '缺少 x-yb-device' });

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
    console.error('[bff]', req.method, req.url, e);
    if (!res.headersSent) json(res, 500, { error: e.message });
    else res.end();
  });
}).listen(config.port, '127.0.0.1', () => {
  console.log(`[bff] listening http://127.0.0.1:${config.port}`);
});
