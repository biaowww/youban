/* ============================================================
   游伴 YouBan · 攻略簿 · 状态卡（长程记忆的压缩形态）
   ────────────────────────────────────────────────────────────
   卡片只记「模型才知道、且游戏数据推不出来」的东西：
     build / keyItems / goals / stuck / decisions / notes / lastSummary
   玩家进度、已过 Boss 都由 gameBrief 从进度推导，**不进卡片**，
   避免模型改写玩家的进度。
   更新方式：每 N 轮用轻量模型读「旧卡 + 最近对话」，产出增量 JSON patch，
   由 mergeCard() 做确定性的合并（去重、裁长、支持删除项）。
   ============================================================ */

const LIMITS = {
  build: 120, lastSummary: 240,
  keyItems: [12, 60], goals: [8, 80], stuck: [8, 80], decisions: [12, 80], notes: [16, 160],
};

const str = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const arr = (v, [n, m]) => (Array.isArray(v)
  ? [...new Set(v.map(x => str(x, m)).filter(Boolean))].slice(-n)
  : []);

export function emptyCard() {
  return { build: '', keyItems: [], goals: [], stuck: [], decisions: [], notes: [], lastSummary: '', updatedTurn: 0 };
}

/* 把任意对象整形成合法卡片（防模型输出脏字段） */
export function normalizeCard(c) {
  c = c && typeof c === 'object' ? c : {};
  return {
    build: str(c.build, LIMITS.build),
    keyItems: arr(c.keyItems, LIMITS.keyItems),
    goals: arr(c.goals, LIMITS.goals),
    stuck: arr(c.stuck, LIMITS.stuck),
    decisions: arr(c.decisions, LIMITS.decisions),
    notes: arr(c.notes, LIMITS.notes),
    lastSummary: str(c.lastSummary, LIMITS.lastSummary),
    updatedTurn: Number.isFinite(c.updatedTurn) ? c.updatedTurn : 0,
  };
}

/**
 * 确定性合并：patch 里的数组追加去重，标量非空则覆盖；
 * patch.doneGoals / patch.resolvedStuck 用于把已完成/已解决的项从列表移除。
 */
export function mergeCard(oldCard, patch, turn) {
  const o = normalizeCard(oldCard);
  const p = patch && typeof patch === 'object' ? patch : {};
  const rm = (list, gone) => {
    const g = new Set(arr(gone, [50, 80]));
    return list.filter(x => !g.has(x));
  };
  const merged = {
    build: str(p.build, LIMITS.build) || o.build,
    keyItems: arr([...o.keyItems, ...(p.keyItems || [])], LIMITS.keyItems),
    goals: arr([...rm(o.goals, p.doneGoals), ...(p.goals || [])], LIMITS.goals),
    stuck: arr([...rm(o.stuck, p.resolvedStuck), ...(p.stuck || [])], LIMITS.stuck),
    decisions: arr([...o.decisions, ...(p.decisions || [])], LIMITS.decisions),
    notes: arr([...o.notes, ...(p.notes || [])], LIMITS.notes),
    lastSummary: str(p.lastSummary, LIMITS.lastSummary) || o.lastSummary,
    updatedTurn: Number.isFinite(turn) ? turn : o.updatedTurn,
  };
  /* goals 与 stuck 互斥：新加进 goals 的若曾是 stuck，视为已解决 */
  merged.stuck = merged.stuck.filter(x => !merged.goals.includes(x));
  return merged;
}

/* 容错解析：去 ``` 围栏、取第一个 { 到最后一个 } */
export function parseCardJson(text) {
  if (typeof text !== 'string') return null;
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

/* 给轻量模型的整理指令：只输出增量 JSON */
export function buildCardUpdateMessages({ card, recent, game }) {
  const system = [
    '你是一个记忆整理器。读「旧状态卡」和「最近对话」，输出一个 JSON 对象作为增量补丁。只输出 JSON，不要任何解释或围栏。',
    '字段（都可省略）：',
    '  build: 玩家的流派/配装（一句话）',
    '  keyItems: 玩家提到的关键道具/装备（数组）',
    '  goals: 玩家当前想做的事（数组）      doneGoals: 已完成、应从 goals 移除的（数组）',
    '  stuck: 玩家卡住的点（数组）          resolvedStuck: 已解决、应从 stuck 移除的（数组）',
    '  decisions: 玩家做过的重要选择（数组）',
    '  notes: 玩家的自述备注/偏好（数组）',
    '  lastSummary: 最近对话一两句摘要',
    '规则：只记对话里明确出现的事实，不推测；不记玩家进度百分比（系统另有来源）；每条 ≤ 40 字。',
  ].join('\n');
  const user = [
    `游戏：《${game.titleMain || game.name}》`,
    '## 旧状态卡', JSON.stringify(card || emptyCard()),
    '## 最近对话',
    ...recent.map(m => `${m.role === 'user' ? '玩家' : '助手'}：${String(m.content).slice(0, 600)}`),
  ].join('\n');
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

/* 调轻量模型刷新卡片；任何失败都回退为旧卡，绝不因记忆整理拖垮对话 */
export async function updateCardWithLLM({ provider, model, card, recent, game, turn }) {
  try {
    const messages = buildCardUpdateMessages({ card, recent, game });
    const res = await provider.chat({ model, messages, temperature: 0.1, maxTokens: 600 });
    const patch = parseCardJson(res.text);
    if (!patch) return { card: normalizeCard(card), changed: false };
    return { card: mergeCard(card, patch, turn), changed: true };
  } catch (e) {
    console.warn('[profile] 状态卡刷新失败，保留旧卡：', e.message);
    return { card: normalizeCard(card), changed: false };
  }
}
