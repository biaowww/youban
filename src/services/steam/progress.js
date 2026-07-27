/* ============================================================
   游伴 YouBan · Steam 同步 · 进度映射引擎（纯函数，框架无关）
   核心：把「玩家已解锁的 Steam 成就」映射为「当前流程进度百分比」。
   - 不依赖 Electron / Tauri / DOM / 网络；Node 与浏览器两端可复用。
   - 双环境：可 require/import，也可挂 window（参照 renderer/adapt.js）。
   ============================================================ */
(function (root) {
  'use strict';

  /** 降级原因码 */
  var ERR = {
    PRIVATE: 'PROFILE_PRIVATE',       // 档案私密 / success=false
    NO_MAP: 'NO_ACHIEVEMENTS_MAP',    // 游戏 JSON 没有 achievements 映射表
  };

  function clampPct(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  /**
   * 把多种输入统一成 { success, achievements[] }。
   * 接受：完整响应对象（含 playerstats）、或直接的成就数组。
   * @param {*} input
   * @returns {{ success: boolean, error?: string, achievements: object[] }}
   */
  function normalize(input) {
    if (input == null) {
      throw new Error('progressFromAchievements: 缺少 playerAchievements 数据');
    }
    // 直接传数组：视为成就列表，默认成功
    if (Array.isArray(input)) {
      return { success: true, achievements: input };
    }
    // 标准 GetPlayerAchievementsResponse
    if (input.playerstats && typeof input.playerstats === 'object') {
      var ps = input.playerstats;
      return {
        success: ps.success !== false,
        error: ps.error,
        achievements: Array.isArray(ps.achievements) ? ps.achievements : [],
      };
    }
    // 容错：{ success, achievements } 这种半归一化形状
    if (typeof input.success === 'boolean' || Array.isArray(input.achievements)) {
      return {
        success: input.success !== false,
        error: input.error,
        achievements: Array.isArray(input.achievements) ? input.achievements : [],
      };
    }
    throw new Error('progressFromAchievements: 无法识别的 playerAchievements 形状');
  }

  /**
   * 由成就解锁情况推算进度。
   * currentPct = 「已解锁且命中映射表」的成就里 progressPct 的最大值（夹在 0..100）；无解锁 → 0。
   * @param {Object} gameJson  src/data/games/*.json 的原始对象（用 gameJson.achievements 作映射表）
   * @param {GetPlayerAchievementsResponse|AchievementState[]} playerAchievements
   * @returns {GameProgress}
   */
  function progressFromAchievements(gameJson, playerAchievements) {
    var map = (gameJson && Array.isArray(gameJson.achievements)) ? gameJson.achievements : [];
    var totalCount = map.length;

    var norm = normalize(playerAchievements);

    // 私密档案 / success=false → 降级返回带 error 的结果（不抛，便于 UI 友好提示）
    if (!norm.success) {
      return {
        currentPct: 0,
        floorPct: 0,
        source: 'steam',
        unlockedCount: 0,
        totalCount: totalCount,
        matchedAchievement: null,
        error: ERR.PRIVATE,
      };
    }

    // 没有映射表，无法换算进度
    if (totalCount === 0) {
      return {
        currentPct: 0,
        floorPct: 0,
        source: 'steam',
        unlockedCount: 0,
        totalCount: 0,
        matchedAchievement: null,
        error: ERR.NO_MAP,
      };
    }

    // apiname -> 映射条目
    var byApi = {};
    for (var i = 0; i < map.length; i++) {
      if (map[i] && map[i].steamId) byApi[map[i].steamId] = map[i];
    }

    // 玩家已解锁集合（apiname -> unlocktime）
    var unlockedAt = {};
    for (var j = 0; j < norm.achievements.length; j++) {
      var a = norm.achievements[j];
      if (a && a.achieved === 1 && a.apiname) unlockedAt[a.apiname] = a.unlocktime || 0;
    }

    var unlockedCount = 0;
    var best = null; // 决定 pct 的映射条目
    for (var k = 0; k < map.length; k++) {
      var m = map[k];
      if (!m || !(m.steamId in unlockedAt)) continue;
      unlockedCount++;
      var pct = clampPct(m.progressPct);
      if (best === null || pct > best.pct) {
        best = { entry: m, pct: pct, unlocktime: unlockedAt[m.steamId] };
      }
    }

    // 语义正名（2026-07-28 地板模型）：成就是单向证据——解锁 X ⇒ 必然通过 X 所在节点，
    // 反之不成立。故这里算出的是进度**下界**（floor），不是"当前进度"。
    // floorPct 为正名字段；currentPct 保留为兼容别名（同值），调用方应迁向 floorPct。
    var floor = best ? best.pct : 0;
    return {
      currentPct: floor,
      floorPct: floor,
      source: 'steam',
      unlockedCount: unlockedCount,
      totalCount: totalCount,
      matchedAchievement: best ? {
        steamId: best.entry.steamId,
        name: best.entry.name,
        progressPct: clampPct(best.entry.progressPct),
        unlocktime: best.unlocktime,
      } : null,
    };
  }

  var api = { progressFromAchievements: progressFromAchievements, ERR: ERR };

  // 双环境导出
  root.YBSteamProgress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
