/* ============================================================
   游伴 YouBan · Steam 同步 · 类型与契约（JSDoc typedef）
   本项目无 TypeScript，用 JSDoc 描述形状，供编辑器/读者参考；运行时不产生代码。
   两类形状：
   (A) Steam Web API 原始响应（由「服务端 BFF」持 Key 调 Steam 得到）
   (B) 应用内归一化类型（前端/引擎使用）
   ============================================================ */

/* ───────── (A) Steam Web API 原始响应 ───────── */

/**
 * IPlayerService/GetOwnedGames 响应。
 * @typedef {Object} GetOwnedGamesResponse
 * @property {Object} response
 * @property {number} response.game_count
 * @property {SteamOwnedGameRaw[]} response.games
 */

/**
 * @typedef {Object} SteamOwnedGameRaw
 * @property {number} appid
 * @property {string} [name]
 * @property {number} [playtime_forever]  分钟
 * @property {string} [img_icon_url]
 */

/**
 * 单条成就状态（GetPlayerAchievements.playerstats.achievements[]）。
 * @typedef {Object} AchievementState
 * @property {string} apiname    成就 API 名（对应游戏 JSON achievements[].steamId）
 * @property {0|1} achieved      是否已解锁
 * @property {number} [unlocktime] 解锁 Unix 时间戳（未解锁为 0）
 * @property {string} [name]
 * @property {string} [description]
 */

/**
 * ISteamUserStats/GetPlayerAchievements 响应。
 * 成功：{ playerstats: { steamID, gameName, achievements[], success:true } }
 * 失败（私密档案/无统计）：{ playerstats: { error, success:false } }
 * @typedef {Object} GetPlayerAchievementsResponse
 * @property {Object} playerstats
 * @property {string} [playerstats.steamID]
 * @property {string} [playerstats.gameName]
 * @property {AchievementState[]} [playerstats.achievements]
 * @property {boolean} playerstats.success
 * @property {string} [playerstats.error]  success=false 时的原因（如 "Profile is not public"）
 */

/* ───────── (B) 应用内归一化类型 ───────── */

/**
 * 归一化后的「拥有的游戏」。
 * @typedef {Object} OwnedGame
 * @property {number} appId
 * @property {string} name
 * @property {number} playtimeForeverMin  累计游玩分钟
 */

/**
 * 进度引擎输出。
 * @typedef {Object} GameProgress
 * @property {number} currentPct          由已解锁成就推出的当前进度（0..100）
 * @property {'steam'} source             进度来源
 * @property {number} unlockedCount       命中映射表且已解锁的成就数
 * @property {number} totalCount          映射表里的成就总数
 * @property {?MatchedAchievement} matchedAchievement  决定 currentPct 的那条（用于「最近解锁」展示），无则 null
 * @property {string} [error]             降级原因码，如 'PROFILE_PRIVATE' / 'NO_ACHIEVEMENTS_MAP'
 */

/**
 * @typedef {Object} MatchedAchievement
 * @property {string} steamId
 * @property {string} name
 * @property {number} progressPct
 * @property {number} [unlocktime]
 */

module.exports = {}; // 仅类型，无运行时导出
