/* ============================================================
   游伴 YouBan · BFF · 存储 · 本地 JSON 文件（开发 / 离线 / 个人内测）
   一款游戏一本簿 → data/<身份>__<gameId>.json
   接口与 supabase.mjs 同形：
     openSession(identity, gameId) → {sessionId, card, turns, messages}
     appendMessages(sessionId, msgs) → turns
     saveCard(sessionId, card)
     getFull(sessionId) → {card, turns, messages(全量)}
     resetSession(sessionId)
   ============================================================ */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { emptyCard, normalizeCard } from '../profile.mjs';

const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
const RECENT = 50;        // openSession 返回的近期条数
const KEEP = 400;         // 单簿最多保留条数（超出裁旧）

export function createFileStore(dir) {
  const file = (id) => path.join(dir, `${id}.json`);

  async function read(id) {
    try { return JSON.parse(await fs.readFile(file(id), 'utf8')); } catch { return null; }
  }
  async function write(id, obj) {
    await fs.mkdir(dir, { recursive: true });
    const tmp = file(id) + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
    await fs.rename(tmp, file(id));
  }
  const mustRead = async (id) => {
    const s = await read(id);
    if (!s) throw new Error(`session 不存在：${id}`);
    return s;
  };

  return {
    name: 'file',

    async openSession(identity, gameId) {
      const who = identity.userId ? `u_${safe(identity.userId)}` : `d_${safe(identity.deviceId)}`;
      const id = `${who}__${safe(gameId)}`;
      let s = await read(id);
      if (!s) {
        s = { sessionId: id, gameId, identity, card: emptyCard(), turns: 0, messages: [], createdAt: new Date().toISOString() };
        await write(id, s);
      }
      return { sessionId: id, card: normalizeCard(s.card), turns: s.turns || 0, messages: s.messages.slice(-RECENT) };
    },

    async appendMessages(id, msgs) {
      const s = await mustRead(id);
      const at = new Date().toISOString();
      s.messages.push(...msgs.map(m => ({ role: m.role, content: m.content, pct: m.pct, at })));
      if (s.messages.length > KEEP) s.messages = s.messages.slice(-KEEP);
      s.turns = (s.turns || 0) + msgs.filter(m => m.role === 'assistant').length;
      await write(id, s);
      return s.turns;
    },

    async saveCard(id, card) {
      const s = await mustRead(id);
      s.card = normalizeCard(card);
      await write(id, s);
    },

    async getFull(id) {
      const s = await mustRead(id);
      return { card: normalizeCard(s.card), turns: s.turns || 0, messages: s.messages };
    },

    async resetSession(id) {
      await fs.rm(file(id), { force: true });
    },
  };
}
