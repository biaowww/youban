/* ============================================================
   游伴 YouBan · 浏览器端 Steam Mock fixtures（普通脚本，随 index.html 载入）
   ────────────────────────────────────────────────────────────
   与 test/fixtures/steam/ 同源同构：4 个演示 SteamID64 表达 4 种档案情形。
   MockSteamClient.fromFixtureDir 是 Node-only，浏览器侧用本文件的内嵌字典。
   apiname 以 data/games/*.json 的 achievements[].steamId 为准（2026-07-28 换真值后）。
   改映射表 → 同步改这里（与 test fixtures 同一条耦合规矩）。
   ============================================================ */
(function (root) {
  'use strict';

  var SID = {
    partial: '76561190000000001',
    full: '76561190000000002',
    private_: '76561190000000003',
    none: '76561190000000004',
  };

  /* 由「该游戏映射表 apiname 全列 + 解锁数」生成一份 GetPlayerAchievements 响应 */
  function resp(sid, apinames, unlockedN, ok) {
    if (ok === false) {
      return { playerstats: { steamID: sid, success: false, error: 'Profile is not public' } };
    }
    var base = 1700036000;
    return {
      playerstats: {
        steamID: sid,
        success: true,
        achievements: apinames.map(function (a, i) {
          var got = i < unlockedN;
          return { apiname: a, achieved: got ? 1 : 0, unlocktime: got ? base + i * 10800 : 0 };
        }),
      },
    };
  }

  /**
   * 用全部游戏数据构建 Mock fixtures 字典（appId → 各演示档案的响应）。
   * @param {Array} games  adaptGame 之前的原始游戏对象数组（含 steamAppId + achievements）
   */
  function buildFixtures(games) {
    var owned = {};
    var achievements = {};
    [SID.partial, SID.full, SID.private_, SID.none].forEach(function (sid) {
      owned[sid] = [];
      achievements[sid] = {};
    });
    (games || []).forEach(function (g) {
      if (!g || !g.steamAppId) return;
      var apinames = (g.achievements || []).map(function (a) { return a.steamId; });
      var ownedRow = { appId: g.steamAppId, name: g.name, playtimeForeverMin: 600 };
      [SID.partial, SID.full, SID.none].forEach(function (sid) { owned[sid].push(ownedRow); });
      // partial：解锁一半（向下取整，至少 1、不满全解），full：全解，none：0，private：拒读
      var half = Math.max(1, Math.min(apinames.length - 1, Math.floor(apinames.length / 2)));
      if (apinames.length <= 1) half = 0; // 单条映射（如 TLOU）partial 视为尚未通关
      achievements[SID.partial][g.steamAppId] = resp(SID.partial, apinames, half, true);
      achievements[SID.full][g.steamAppId] = resp(SID.full, apinames, apinames.length, true);
      achievements[SID.none][g.steamAppId] = resp(SID.none, apinames, 0, true);
      achievements[SID.private_][g.steamAppId] = resp(SID.private_, apinames, 0, false);
    });
    return { owned: owned, achievements: achievements };
  }

  root.YBSteamFixtures = { SID: SID, buildFixtures: buildFixtures };
})(typeof window !== 'undefined' ? window : globalThis);
