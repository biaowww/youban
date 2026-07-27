/* ============================================================
   Steam 成就 → 进度 同步管线 单测（确定性、离线、fixtures 驱动）
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import progressApi from '../services/steam/progress.js';
import clientApi from '../services/steam/client.js';
import adaptMod from '../renderer/adapt.js';

const { progressFromAchievements, ERR } = progressApi;
const { MockSteamClient } = clientApi;
const { adaptGame } = adaptMod;

const FIX_DIR = fileURLToPath(new URL('./fixtures/steam/', import.meta.url));
const readJson = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));

const jedi = readJson('../data/games/jedi_fo.json');
const wukong = readJson('../data/games/black_myth_wukong.json');

const SID = { partial: '76561190000000001', full: '76561190000000002', private: '76561190000000003', none: '76561190000000004' };
const APP = { jedi: 1172380, wukong: 2358720 };

describe('progressFromAchievements · 由成就推进度', () => {
  it('部分解锁 → 取已解锁成就 progressPct 的最大值（jedi=44）', () => {
    const resp = readJson('./fixtures/steam/jedi_fo.partial.json');
    const p = progressFromAchievements(jedi, resp);
    expect(p.currentPct).toBe(44);
    expect(p.source).toBe('steam');
    expect(p.unlockedCount).toBe(5);
    expect(p.totalCount).toBe(10);
    expect(p.matchedAchievement.steamId).toBe('Achievement_GOSCC_13'); // Her Name Was Masana Tide（真值，2026-07-28 核实）
    expect(p.matchedAchievement.progressPct).toBe(44);
    expect(typeof p.matchedAchievement.unlocktime).toBe('number');
    expect(p.error).toBeUndefined();
  });

  it('部分解锁 · 黑神话（wukong=40，matched=ACH_SPIDER）', () => {
    const resp = readJson('./fixtures/steam/black_myth_wukong.partial.json');
    const p = progressFromAchievements(wukong, resp);
    expect(p.currentPct).toBe(40);
    expect(p.unlockedCount).toBe(4);
    expect(p.matchedAchievement.steamId).toBe('ACH_SPIDER');
  });

  it('全解锁 → 100，matched 为 100% 那条', () => {
    const p = progressFromAchievements(jedi, readJson('./fixtures/steam/jedi_fo.full.json'));
    expect(p.currentPct).toBe(100);
    expect(p.unlockedCount).toBe(10);
    expect(p.matchedAchievement.progressPct).toBe(100);
    expect(p.matchedAchievement.steamId).toBe('Achievement_GOSCC_6'); // Trust Only In The Force（真值，2026-07-28 核实）
  });

  it('无任何解锁 → 0，matched 为 null（无 error，仅是还没玩）', () => {
    const p = progressFromAchievements(jedi, readJson('./fixtures/steam/jedi_fo.none.json'));
    expect(p.currentPct).toBe(0);
    expect(p.unlockedCount).toBe(0);
    expect(p.matchedAchievement).toBeNull();
    expect(p.error).toBeUndefined();
  });

  it('私密档案 success=false → 降级结果带 error=PROFILE_PRIVATE', () => {
    const p = progressFromAchievements(jedi, readJson('./fixtures/steam/jedi_fo.private.json'));
    expect(p.error).toBe(ERR.PRIVATE);
    expect(p.currentPct).toBe(0);
    expect(p.matchedAchievement).toBeNull();
    expect(p.totalCount).toBe(10); // 映射表仍可知总数
  });

  it('游戏无映射表 → error=NO_ACHIEVEMENTS_MAP，不抛', () => {
    const p = progressFromAchievements({ id: 'x' }, readJson('./fixtures/steam/jedi_fo.full.json'));
    expect(p.error).toBe(ERR.NO_MAP);
    expect(p.currentPct).toBe(0);
    expect(p.totalCount).toBe(0);
  });

  it('接受直接传入的成就数组（非完整响应）', () => {
    const arr = readJson('./fixtures/steam/jedi_fo.partial.json').playerstats.achievements;
    const p = progressFromAchievements(jedi, arr);
    expect(p.currentPct).toBe(44);
  });

  it('缺少 playerAchievements → 抛可识别错误', () => {
    expect(() => progressFromAchievements(jedi, null)).toThrow(/缺少 playerAchievements/);
  });

  it('currentPct 始终夹在 0..100', () => {
    const weird = { id: 'w', achievements: [{ steamId: 'A', name: '越界', progressPct: 9999 }] };
    const resp = { playerstats: { success: true, achievements: [{ apiname: 'A', achieved: 1, unlocktime: 1 }] } };
    const p = progressFromAchievements(weird, resp);
    expect(p.currentPct).toBe(100);
  });
});

describe('MockSteamClient · 三种情形', () => {
  const client = MockSteamClient.fromFixtureDir(FIX_DIR);

  it('getOwnedGames 返回归一化的 OwnedGame[]', async () => {
    const owned = await client.getOwnedGames(SID.partial);
    expect(Array.isArray(owned)).toBe(true);
    expect(owned.length).toBe(2);
    expect(owned[0]).toHaveProperty('appId');
    expect(owned[0]).toHaveProperty('playtimeForeverMin');
  });

  it('成功（部分解锁）：getPlayerAchievements → success=true，可推出进度', async () => {
    const resp = await client.getPlayerAchievements(SID.partial, APP.jedi);
    expect(resp.playerstats.success).toBe(true);
    expect(progressFromAchievements(jedi, resp).currentPct).toBe(44);
  });

  it('私密档案：success=false → 引擎降级 error', async () => {
    const resp = await client.getPlayerAchievements(SID.private, APP.jedi);
    expect(resp.playerstats.success).toBe(false);
    expect(progressFromAchievements(jedi, resp).error).toBe(ERR.PRIVATE);
  });

  it('无解锁：success=true 但进度 0', async () => {
    const resp = await client.getPlayerAchievements(SID.none, APP.wukong);
    expect(resp.playerstats.success).toBe(true);
    expect(progressFromAchievements(wukong, resp).currentPct).toBe(0);
  });

  it('未知 (steamId, appId) → reject', async () => {
    await expect(client.getPlayerAchievements('76561190000099999', APP.jedi)).rejects.toThrow();
  });
});

describe('与 adaptGame 的衔接：同一套 progressPct', () => {
  it('adaptGame(game).ach 的 (id→pct) 与映射引擎用的 achievements 一致', () => {
    const v = adaptGame(jedi);
    // adaptGame 把 steamId→id、progressPct→pct
    const fromAdapt = Object.fromEntries(v.ach.map(a => [a.id, a.pct]));
    const fromRaw = Object.fromEntries(jedi.achievements.map(a => [a.steamId, a.progressPct]));
    expect(fromAdapt).toEqual(fromRaw);
  });

  it('引擎算出的 matched.progressPct 能在 adaptGame(game).ach 里找到同名条目', () => {
    const resp = readJson('./fixtures/steam/jedi_fo.partial.json');
    const p = progressFromAchievements(jedi, resp);
    const v = adaptGame(jedi);
    const hit = v.ach.find(a => a.id === p.matchedAchievement.steamId);
    expect(hit).toBeTruthy();
    expect(hit.pct).toBe(p.matchedAchievement.progressPct);
  });
});
