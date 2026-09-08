/* ============================================================
   游伴 YouBan · 数据适配层（可测、双环境）
   - loadRawGames：数据源加载（Tauri invoke / Electron gameAPI / 浏览器预览回退）
   - adaptGame：把 src/data/games/*.json 的 src 字段映射为视图模型（短字段）
   说明：本文件是「普通脚本」，不经 build:ui 编译；浏览器里在 dist/app.js 之前以
        <script src="adapt.js"></script> 引入，挂到 window；Node/Vitest 里经
        module.exports 导出，供单测 import。改了游戏 JSON 字段名要同步改这里。
   ============================================================ */
(function (root) {
  /* ───────── 数据源：Tauri(invoke) 优先，回退 Electron(gameAPI) ───────── */
  async function loadRawGames() {
    const t = root.__TAURI__;
    const invoke = t && (t.core && t.core.invoke ? t.core.invoke : t.invoke);
    if (invoke) {
      const list = await invoke("get_game_list");
      return Promise.all((list || []).map(g => invoke("get_game_data", { id: g.id })));
    }
    if (root.gameAPI) {
      const list = await root.gameAPI.getGameList();
      return Promise.all((list || []).map(g => root.gameAPI.getGameData(g.id)));
    }
    if (Array.isArray(root.__YB_RAW__)) {
      return root.__YB_RAW__; // 浏览器预览回退（preview.html 注入）
    }
    throw new Error("无可用数据源（Tauri / gameAPI / __YB_RAW__ 均不可用）");
  }

  /* 评分口径 → 展示标签。非 Steam 游戏（主机独占）绝不冒充 Steam 好评率。 */
  const SCORE_LABEL = {
    steam: 'Steam 好评率', psn: 'PS Store 评分', nintendo: 'Nintendo eShop 评分',
    metacritic: 'Metacritic 媒体均分', opencritic: 'OpenCritic 媒体均分',
    douban: '豆瓣评分', ign: 'IGN 评分', other: '综合评分',
  };
  /* 取评分：新结构 {value,origin,note} 优先；legacy 数字回退为 steam 口径（线上库仍是旧结构） */
  function pickScore(o, legacy) {
    if (o && typeof o.value === 'number') {
      return { value: o.value, origin: o.origin || 'other', label: SCORE_LABEL[o.origin] || SCORE_LABEL.other, note: o.note || '' };
    }
    if (typeof legacy === 'number') {
      return { value: legacy, origin: 'steam', label: SCORE_LABEL.steam, note: '' };
    }
    return null;
  }

  /* ───────── 适配器：src JSON → 视图模型 ───────── */
  function adaptGame(g) {
    const t = g.gameTheme || {};
    const ov = g.overview || {};
    const ps = g.playerSentiment || {};
    const kw = ps.keywords || {};
    const sd = g.saveDownload;
    return {
      id: g.id,
      titleMain: g.titleMain || g.name,
      titleSub: g.titleSub || '',
      short: g.short || g.name,
      developer: g.developer,
      year: g.year,
      genre: g.genre || '',
      hoursMain: g.totalHoursMain,
      currentPct: g.currentPct == null ? 0 : g.currentPct,
      poster: g.posterUrl,
      banner: g.bannerUrl,
      theme: {
        bg: t.bg, card: t.bgCard || t.card, accent: t.accent, accent2: t.accent2, text: t.text,
      },
      tagline: ov.tagline || '',
      desc: ov.description || '',
      highlights: ov.highlights || [],
      chapters: (g.chapters || []).map(c => ({
        name: c.name, planet: c.planet,
        start: c.progressStart, end: c.progressEnd,
        hype: c.hypeScore, key: c.keyEvent,
        plot: c.plotDetail, goals: c.playerGoals, chars: c.newCharacters,
      })),
      bosses: (g.bossSaves || []).map(b => ({
        id: b.id, name: b.name, nameEn: b.nameEn || '',
        pct: b.progressPct, planet: b.planet,
        gap: b.storyGap || 0, hi: !!b.highlight,
        plot: (b.context || {}).plot, chars: (b.context || {}).characters, fight: (b.context || {}).gameplay,
        folder: b.folder,
      })),
      hype: (g.hypePeaks || []).map(p => ({
        pct: p.progressPct, label: p.label, score: p.score, color: p.color,
      })),
      entries: (g.entryPoints || []).map(e => ({
        pct: e.progressPct, label: e.label, reason: e.reason,
      })),
      journey: (g.protagonistJourney || []).map(j => ({
        pct: j.progressPct, event: j.event, desc: j.description, unlocks: j.unlocks || [],
      })),
      platforms: g.platforms && g.platforms.length ? g.platforms : ['pc'],
      bossTerm: g.bossTerm || 'Boss 战',
      sentiment: {
        /* 玩家分 / 媒体分分离（schema v2）；线上库仍是旧结构，故保留 steamScore 回退。
           score 保持为「主展示分」——有玩家分用玩家分，否则用媒体分，兼容既有 UI。 */
        player: pickScore(ps.playerScore, ps.steamScore),
        media: pickScore(ps.mediaScore, null),
        score: (pickScore(ps.playerScore, ps.steamScore) || pickScore(ps.mediaScore, null) || {}).value || 0,
        source: ps.source || '', note: ps.note || '',
        praise: kw.praise || [], criticism: kw.criticism || [], hot: kw.hot || [],
        quotes: (ps.testimonials || []).map(q => ({ text: q.text, author: q.author, up: q.upvotes })),
      },
      ach: (g.achievements || []).map(a => ({ id: a.steamId, name: a.name, pct: a.progressPct })),
      appId: g.steamAppId,
      achNote: '已读取 Steam 成就，进度已同步至最近解锁节点',
      save: sd ? {
        steps: (sd.instructions || '').split('\n').map(s => s.replace(/^\d+\.\s*/, '')).filter(Boolean),
        path: sd.savePath || '',
        url: sd.url || '',
      } : null,
    };
  }

  root.adaptGame = adaptGame;
  root.loadRawGames = loadRawGames;
  if (typeof module !== 'undefined' && module.exports) module.exports = { adaptGame, loadRawGames };
})(typeof window !== 'undefined' ? window : globalThis);
