/* ============================================================
   游伴 YouBan · BFF · 玩家进度（跨端互通的那份）
   表：user_game_progress（当前值，1 行/用户/游戏）+ progress_events（追加式历史）
       见 backend/supabase/migrations/0001_init.sql
   写入规则：**后写为准**（last-write-wins，按服务器时间）。进度是玩家自己拖的，
   没有"合并"语义；客户端带上 clientAt 仅作审计，不参与裁决。
   两种实现同形：supabase（线上）| memory（本地开发 / 测试）。
   ============================================================ */
const SOURCES = new Set(['manual', 'steam', 'screenshot']);
export const clampPct = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; };
const srcOf = (s) => (SOURCES.has(s) ? s : 'manual');

export function createSupabaseProgress({ url, serviceKey, fetchImpl = fetch }) {
  if (!url || !serviceKey) throw new Error('进度存储需要 SUPABASE_URL 与 SERVICE_ROLE_KEY');
  const REST = url.replace(/\/$/, '') + '/rest/v1';
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  async function q(method, pathAndQuery, body, extra = {}) {
    const r = await fetchImpl(`${REST}/${pathAndQuery}`, { method, headers: { ...H, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) throw new Error(`Supabase ${method} ${pathAndQuery} → ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  return {
    name: 'supabase',
    async list(userId) {
      const rows = await q('GET', `user_game_progress?select=game_id,current_pct,source,updated_at&user_id=eq.${userId}`) || [];
      return rows.map(r => ({ gameId: r.game_id, pct: Number(r.current_pct), source: r.source, updatedAt: r.updated_at }));
    },
    async upsert(userId, gameId, pct, source) {
      const row = { user_id: userId, game_id: gameId, current_pct: clampPct(pct), source: srcOf(source) };
      const out = await q('POST', 'user_game_progress?on_conflict=user_id,game_id&select=game_id,current_pct,source,updated_at', row,
        { Prefer: 'resolution=merge-duplicates,return=representation' });
      await q('POST', 'progress_events', { user_id: userId, game_id: gameId, pct: row.current_pct, source: row.source }, { Prefer: 'return=minimal' });
      const r = Array.isArray(out) && out[0] ? out[0] : row;
      return { gameId, pct: Number(r.current_pct), source: r.source, updatedAt: r.updated_at || new Date().toISOString() };
    },
  };
}

export function createMemoryProgress() {
  const m = new Map(); // `${userId}|${gameId}` → row
  return {
    name: 'memory',
    async list(userId) { return [...m.values()].filter(r => r.userId === userId).map(({ userId: _u, ...r }) => r); },
    async upsert(userId, gameId, pct, source) {
      const r = { userId, gameId, pct: clampPct(pct), source: srcOf(source), updatedAt: new Date().toISOString() };
      m.set(`${userId}|${gameId}`, r);
      const { userId: _u, ...pub } = r;
      return pub;
    },
  };
}
