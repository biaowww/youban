/* ============================================================
   攻略簿（Companion AI）· 纯函数单测
   覆盖 BFF 的四个无副作用模块：游戏简报（含防剧透边界）、Prompt 拼装、
   状态卡合并 / 解析、战报渲染；以及 SSE 解析与文件存储的往返。
   用真实游戏数据（黑神话）做 fixture，进度 61% = 第四回盘丝岭。
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import validator from '../scripts/validate-games.js';
import { buildGameBrief, deriveState } from '../../backend/bff/lib/gameBrief.mjs';
import { buildMessages } from '../../backend/bff/lib/promptBuilder.mjs';
import { emptyCard, normalizeCard, mergeCard, parseCardJson, buildCardUpdateMessages } from '../../backend/bff/lib/profile.mjs';
import { renderReport } from '../../backend/bff/lib/report.mjs';
import { parseSse } from '../../backend/bff/lib/providers/glm.mjs';
import { createMockProvider } from '../../backend/bff/lib/providers/mock.mjs';
import { createFileStore } from '../../backend/bff/lib/store/file.mjs';

const { loadGameFiles } = validator;
const games = loadGameFiles().map(x => x.game);
const wukong = games.find(g => g.id === 'black_myth_wukong');
const amnesia = games.find(g => g.id === 'amnesia_dark_descent');

describe('gameBrief · 进度推导', () => {
  it('61% 落在第四回，已过 3 章', () => {
    const st = deriveState(wukong, 61);
    expect(st.current.name).toContain('第四回');
    expect(st.passedChapters.length).toBe(3);
    expect(st.passedBosses.every(b => b.progressPct <= 61)).toBe(true);
    expect(st.nextBoss.progressPct).toBeGreaterThan(61);
    expect(st.futureBosses.every(b => b.progressPct > st.nextBoss.progressPct)).toBe(true);
  });
  it('0% 与 100% 不崩', () => {
    expect(deriveState(wukong, 0).current).toBeTruthy();
    expect(deriveState(wukong, 100).current).toBeTruthy();
    expect(deriveState(wukong, 100).nextBoss).toBeNull();
  });
});

describe('gameBrief · 防剧透边界', () => {
  const on = buildGameBrief(wukong, 61, true);
  const off = buildGameBrief(wukong, 61, false);
  const st = deriveState(wukong, 61);
  const futureNames = st.futureBosses.map(b => b.name.split(' ')[0]);

  it('带当前章节与下一个 Boss 名字', () => {
    expect(on).toContain('# 玩家进度：61%');
    expect(on).toContain(st.current.name);
    expect(on).toContain(st.nextBoss.name);
  });
  it('guard 开：更往后的 Boss 一个都不出现', () => {
    for (const n of futureNames) expect(on).not.toContain(n);
    expect(on).toContain('玩家开启了防剧透');
  });
  it('guard 关：后续 Boss 列出，但仍要求先提示', () => {
    expect(off).toContain(futureNames[0]);
    expect(off).toContain('玩家关闭了防剧透');
  });
  it('长度受 maxChars 约束', () => {
    expect(buildGameBrief(wukong, 61, true, { maxChars: 800 }).length).toBeLessThanOrEqual(800);
    expect(on.length).toBeLessThanOrEqual(3200);
  });
  it('无传统 Boss 的作品沿用自己的术语', () => {
    expect(buildGameBrief(amnesia, 30, true)).toContain('高压遭遇');
  });
  it('17 款全部能出简报', () => {
    for (const g of games) expect(buildGameBrief(g, 50, true).length).toBeGreaterThan(200);
  });
});

describe('promptBuilder', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  const msgs = buildMessages({ game: wukong, pct: 61, guard: true, card: null, history, userMessage: '我卡住了', historyMessages: 10 });
  it('system 在首、user 在尾、历史截到最近 10 条', () => {
    expect(msgs[0].role).toBe('system');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: '我卡住了' });
    expect(msgs.length).toBe(12);
    expect(msgs[1].content).toBe('m20');
  });
  it('system 含简报、规则与空卡片提示', () => {
    expect(msgs[0].content).toContain('# 玩家进度：61%');
    expect(msgs[0].content).toContain('剧透边界');
    expect(msgs[0].content).toContain('第一次对话');
  });
  it('有卡片时只带非空字段', () => {
    const m = buildMessages({ game: wukong, pct: 61, card: { build: '棍势流', keyItems: [], notes: ['怕蜘蛛'] }, history: [], userMessage: 'x' });
    expect(m[0].content).toContain('棍势流');
    expect(m[0].content).toContain('怕蜘蛛');
    expect(m[0].content).not.toContain('keyItems');
  });
});

describe('profile · 状态卡', () => {
  it('normalize 裁掉脏字段、去重、限长', () => {
    const c = normalizeCard({ build: '  x  ', keyItems: ['a', 'a', '', 1, 'b'], junk: 1, notes: 'no' });
    expect(c).toEqual({ ...emptyCard(), build: 'x', keyItems: ['a', 'b'] });
  });
  it('merge：追加去重、标量覆盖、done/resolved 移除、goals 与 stuck 互斥', () => {
    const old = { build: '旧', goals: ['去黄风岭'], stuck: ['打不过虎先锋'], notes: ['n1'] };
    const m = mergeCard(old, { build: '新', goals: ['打不过虎先锋', '去黄风岭'], resolvedStuck: ['打不过虎先锋'], notes: ['n1', 'n2'], lastSummary: 's' }, 6);
    expect(m.build).toBe('新');
    expect(m.goals).toEqual(['去黄风岭', '打不过虎先锋']);
    expect(m.stuck).toEqual([]);
    expect(m.notes).toEqual(['n1', 'n2']);
    expect(m.lastSummary).toBe('s');
    expect(m.updatedTurn).toBe(6);
  });
  it('parseCardJson 容忍围栏与前后废话', () => {
    expect(parseCardJson('好的：\n```json\n{"build":"a"}\n```')).toEqual({ build: 'a' });
    expect(parseCardJson('not json')).toBeNull();
  });
  it('整理指令只要求 JSON 且不记进度', () => {
    const m = buildCardUpdateMessages({ card: emptyCard(), recent: [{ role: 'user', content: 'hi' }], game: wukong });
    expect(m[0].content).toContain('只输出 JSON');
    expect(m[0].content).toContain('不记玩家进度');
  });
});

describe('report · 战报', () => {
  it('含标题、进度、章节、卡片各节', () => {
    const md = renderReport({ game: wukong, pct: 61, card: { build: '棍势', goals: ['过盘丝岭'] }, turns: 4 });
    expect(md).toContain('《黑神话：悟空》攻略簿');
    expect(md).toContain('**61%**');
    expect(md).toContain('第四回');
    expect(md).toContain('棍势');
    expect(md).toContain('- 过盘丝岭');
  });
});

describe('providers', () => {
  it('parseSse 逐段产出 delta 并在 [DONE] 停止', async () => {
    const raw = 'data: {"choices":[{"delta":{"content":"你"}}]}\n\ndata: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\ndata: {"choices":[{"delta":{"content":"不该出现"}}]}\n';
    const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(raw)); c.close(); } });
    const out = [];
    for await (const d of parseSse(body)) out.push(d);
    expect(out.join('')).toBe('你好');
  });
  it('mock provider 会复述进度与下一个 Boss', async () => {
    const p = createMockProvider();
    const msgs = buildMessages({ game: wukong, pct: 61, history: [], userMessage: '下一步？' });
    let s = '';
    for await (const d of p.stream({ messages: msgs })) s += d;
    expect(s).toContain('61%');
    expect(s).toContain(deriveState(wukong, 61).nextBoss.name.split(' ')[0]);
  });
});

describe('store · file', () => {
  it('openSession / appendMessages / saveCard / getFull / reset 往返', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'yb-companion-'));
    try {
      const st = createFileStore(dir);
      const s1 = await st.openSession({ deviceId: 'dev-123' }, 'black_myth_wukong');
      expect(s1.turns).toBe(0);
      const turns = await st.appendMessages(s1.sessionId, [{ role: 'user', content: 'a', pct: 61 }, { role: 'assistant', content: 'b', pct: 61 }]);
      expect(turns).toBe(1);
      await st.saveCard(s1.sessionId, { build: 'x' });
      const s2 = await st.openSession({ deviceId: 'dev-123' }, 'black_myth_wukong');
      expect(s2.messages.length).toBe(2);
      expect(s2.card.build).toBe('x');
      expect((await st.getFull(s1.sessionId)).turns).toBe(1);
      await st.resetSession(s1.sessionId);
      expect((await st.openSession({ deviceId: 'dev-123' }, 'black_myth_wukong')).turns).toBe(0);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
