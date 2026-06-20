/* ============================================================
   游伴 YouBan · Steam 同步 · BFF 接口契约 + Mock 客户端
   ────────────────────────────────────────────────────────────
   【架构】前端绝不能持有 Steam Web API Key。真实数据流：
       前端 → 自己的 BFF 服务端（持 Key、调 Steam）→ 返回前端
   Key 只在服务端、走环境变量（如 process.env.STEAM_API_KEY）；用户档案需公开。
   本文件只定义「前端将调用的接口契约」，并提供一个**离线、确定性**的 MockSteamClient
   （从 fixtures 取数，不发任何网络请求），供开发与测试。日后接真 BFF：实现同名方法、
   内部改为 HTTP 调你的服务端即可，调用方无需改动。
   ============================================================ */
(function (root) {
  'use strict';

  /**
   * BFF 客户端接口（契约）。真实实现与 Mock 都应满足：
   *   getOwnedGames(steamId) -> Promise<OwnedGame[]>
   *   getPlayerAchievements(steamId, appId) -> Promise<GetPlayerAchievementsResponse>
   *
   * 真实实现示意（放在「服务端」，此处仅注释，不在前端执行）：
   *   // server 侧：const key = process.env.STEAM_API_KEY;
   *   // GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=KEY&steamid=...
   *   // GET https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=KEY&steamid=...&appid=...
   *   // 前端的 HttpSteamClient 则是：fetch(`/api/steam/owned?steamId=...`) 调自己的 BFF。
   */

  /**
   * 离线 Mock 客户端：从内存中的 fixtures 字典取数。
   * fixtures 形状：
   *   {
   *     owned: { [steamId]: OwnedGame[] },
   *     achievements: { [steamId]: { [appId]: GetPlayerAchievementsResponse } }
   *   }
   * 三种情形由不同 steamId 表达（见 fixtures/steam/manifest.json）：
   *   - 部分解锁 / 全解锁 / 无解锁 → success:true 的响应（成就数组不同）
   *   - 私密档案 → success:false 的响应
   */
  function MockSteamClient(fixtures) {
    if (!fixtures || typeof fixtures !== 'object') {
      throw new Error('MockSteamClient: 需要 fixtures 字典');
    }
    this.fixtures = {
      owned: fixtures.owned || {},
      achievements: fixtures.achievements || {},
    };
  }

  MockSteamClient.prototype.getOwnedGames = function (steamId) {
    var owned = this.fixtures.owned[steamId];
    if (!owned) {
      return Promise.reject(new Error('MockSteamClient: 无此 steamId 的 owned fixture: ' + steamId));
    }
    return Promise.resolve(owned.slice());
  };

  MockSteamClient.prototype.getPlayerAchievements = function (steamId, appId) {
    var perGame = this.fixtures.achievements[steamId];
    var resp = perGame && (perGame[appId] || perGame[String(appId)]);
    if (!resp) {
      return Promise.reject(new Error('MockSteamClient: 无此 (steamId, appId) 的成就 fixture: ' + steamId + ' / ' + appId));
    }
    return Promise.resolve(resp);
  };

  /**
   * Node 便捷加载器：从 fixtures 目录的 manifest.json 构建一个 MockSteamClient。
   * 仅在 Node 环境可用（惰性 require('fs')，不污染浏览器构建）。
   * @param {string} dir  fixtures/steam 目录绝对路径
   * @returns {MockSteamClient}
   */
  MockSteamClient.fromFixtureDir = function (dir) {
    if (typeof require === 'undefined') {
      throw new Error('MockSteamClient.fromFixtureDir 仅在 Node 环境可用');
    }
    var fs = require('fs');
    var path = require('path');
    var manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    var achievements = {};
    Object.keys(manifest.achievements || {}).forEach(function (sid) {
      achievements[sid] = {};
      var perGame = manifest.achievements[sid];
      Object.keys(perGame).forEach(function (appId) {
        achievements[sid][appId] = JSON.parse(fs.readFileSync(path.join(dir, perGame[appId]), 'utf8'));
      });
    });
    return new MockSteamClient({ owned: manifest.owned || {}, achievements: achievements });
  };

  var api = { MockSteamClient: MockSteamClient };

  root.YBSteamClient = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
