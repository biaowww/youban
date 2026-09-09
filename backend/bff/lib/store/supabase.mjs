/* ============================================================
   游伴 YouBan · BFF · 存储 · Supabase（线上，service_role 经 PostgREST）
   表见 backend/supabase/migrations/0002_companion.sql。
   service_role 绕过 RLS：device_id 身份的行只能由这里写，anon 永远读不到。
   接口与 file.mjs 同形。
   ============================================================ */
import { emptyCard, normalizeCard } from '../profile.mjs';

export function createSupabaseStore({ url, serviceKey, fetchImpl = fetch }) {
  if (!url || !serviceKey) throw new Error('COMPANION_STORE=supabase 需要 SUPABASE_URL 与 SERVICE_ROLE_KEY');
  const REST = url.replace(/\/$/, '') + '/rest/v1';
  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  async function q(method, pathAndQuery, body, extraHeaders = {}) {
    const r = await fetchImpl(`${REST}/${pathAndQuery}`, {
      method, headers: { ...H, ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Supabase ${method} ${pathAndQuery} → ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  const one = (rows) => (Array.isArray(rows) && rows.length ? rows[0] : null);

  return {
    name: 'supabase',

    async openSession(identity, gameId) {
      const filt = identity.userId ? `user_id=eq.${identity.userId}` : `device_id=eq.${encodeURIComponent(identity.deviceId)}`;
      let s = one(await q('GET', `companion_sessions?select=id,turns&game_id=eq.${encodeURIComponent(gameId)}&${filt}&limit=1`));
      if (!s) {
        s = one(await q('POST', 'companion_sessions?select=id,turns',
          { user_id: identity.userId || null, device_id: identity.userId ? null : identity.deviceId, game_id: gameId },
          { Prefer: 'return=representation' }));
      }
      const prof = one(await q('GET', `companion_profiles?select=card&session_id=eq.${s.id}&limit=1`));
      const msgs = await q('GET', `companion_messages?select=role,content,pct,created_at&session_id=eq.${s.id}&order=created_at.desc&limit=50`) || [];
      return {
        sessionId: s.id,
        card: normalizeCard(prof ? prof.card : emptyCard()),
        turns: s.turns || 0,
        messages: msgs.reverse().map(m => ({ role: m.role, content: m.content, pct: m.pct, at: m.created_at })),
      };
    },

    async appendMessages(id, msgs) {
      await q('POST', 'companion_messages', msgs.map(m => ({ session_id: id, role: m.role, content: m.content, pct: m.pct ?? null })),
        { Prefer: 'return=minimal' });
      const inc = msgs.filter(m => m.role === 'assistant').length;
      const cur = one(await q('GET', `companion_sessions?select=turns&id=eq.${id}&limit=1`));
      const turns = (cur?.turns || 0) + inc;
      await q('PATCH', `companion_sessions?id=eq.${id}`, { turns }, { Prefer: 'return=minimal' });
      return turns;
    },

    async saveCard(id, card) {
      await q('POST', 'companion_profiles?on_conflict=session_id', { session_id: id, card: normalizeCard(card) },
        { Prefer: 'resolution=merge-duplicates,return=minimal' });
    },

    async getFull(id) {
      const s = one(await q('GET', `companion_sessions?select=turns&id=eq.${id}&limit=1`));
      const prof = one(await q('GET', `companion_profiles?select=card&session_id=eq.${id}&limit=1`));
      const msgs = await q('GET', `companion_messages?select=role,content,pct,created_at&session_id=eq.${id}&order=created_at.asc&limit=1000`) || [];
      return { card: normalizeCard(prof ? prof.card : emptyCard()), turns: s?.turns || 0,
        messages: msgs.map(m => ({ role: m.role, content: m.content, pct: m.pct, at: m.created_at })) };
    },

    async resetSession(id) {
      /* 级联删除：删 session 即清 messages + profile */
      await q('DELETE', `companion_sessions?id=eq.${id}`, undefined, { Prefer: 'return=minimal' });
    },
  };
}
