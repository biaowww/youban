/* ============================================================
   游伴 YouBan · 攻略簿 · 游戏简报（纯函数）
   ────────────────────────────────────────────────────────────
   这是攻略簿区别于「直接开一个 Gemini 长对话」的核心：
   把我们已核实的结构化游戏数据（章节 / Boss / 入场点 / 主角历程），
   按玩家当前进度切出一份 2–4KB 的简报塞进 system prompt——
   模型因此天然知道玩家在哪、刚过了谁、下一个是谁；
   同时**防剧透边界在这里执行**：guard 开启时，超过进度的内容根本不进 prompt，
   而不是靠模型自觉。
   输入是原始游戏 JSON（与 src/data/games 同构），不经 adaptGame。
   ============================================================ */

const clip = (s, n) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

/* 由进度推导玩家处境；进度以客户端为准，模型不改它 */
export function deriveState(game, pct) {
  const chapters = (game.chapters || []).slice().sort((a, b) => a.progressStart - b.progressStart);
  const current = chapters.find(c => pct >= c.progressStart && pct < c.progressEnd)
    || chapters[chapters.length - 1] || null;
  const passedChapters = chapters.filter(c => c.progressEnd <= pct);

  const bosses = (game.bossSaves || []).slice().sort((a, b) => a.progressPct - b.progressPct);
  const passedBosses = bosses.filter(b => b.progressPct <= pct);
  const upcoming = bosses.filter(b => b.progressPct > pct);
  const nextBoss = upcoming[0] || null;
  const futureBosses = upcoming.slice(1);

  const journey = (game.protagonistJourney || []).filter(j => j.progressPct <= pct);
  const unlocks = [...new Set(journey.flatMap(j => j.unlocks || []))];

  return { current, passedChapters, passedBosses, nextBoss, futureBosses, unlocks };
}

/**
 * 组简报。guard=true 时：只给到当前章节 + 下一个 Boss 的名字与打法（不含剧情），
 * 之后的一切不进 prompt。guard=false 时补上后续 Boss 名单，但边界声明改为「先提示」。
 */
export function buildGameBrief(game, pct, guard = true, opts = {}) {
  const max = opts.maxChars || 3200;
  const term = game.bossTerm || 'Boss 战';
  const st = deriveState(game, pct);
  const L = [];

  L.push(`# 游戏：《${game.titleMain || game.name}》${game.nameEn ? `（${game.nameEn}）` : ''}`);
  L.push(`类型：${game.genre || '—'}｜主线约 ${game.totalHoursMain || '?'} 小时｜本作把关键遭遇称为「${term}」`);
  if (game.overview && game.overview.tagline) L.push(`一句话：${clip(game.overview.tagline, 60)}`);

  L.push('', `# 玩家进度：${pct}%`);
  if (st.current) {
    L.push(`当前章节：${st.current.name}（${st.current.progressStart}–${st.current.progressEnd}%）· ${st.current.planet || ''}`);
    L.push(`本章剧情：${clip(st.current.plotDetail, 420)}`);
    L.push(`本章目标：${clip(st.current.playerGoals, 160)}`);
    if (st.current.newCharacters) L.push(`本章登场：${clip(st.current.newCharacters, 160)}`);
  }
  if (st.passedChapters.length) {
    L.push('已走过：' + st.passedChapters.map(c => `${c.name}（${clip(c.keyEvent, 40)}）`).join('；'));
  }
  if (st.unlocks.length) L.push('已解锁能力/机制：' + st.unlocks.slice(0, 14).join('、'));

  L.push('', `# ${term}`);
  L.push('已经历：' + (st.passedBosses.length
    ? st.passedBosses.map(b => `${b.name}（${b.planet || ''}，${b.progressPct}%）`).join('；')
    : '尚无'));
  if (st.nextBoss) {
    L.push(`下一个：${st.nextBoss.name}（${st.nextBoss.planet || ''}，${st.nextBoss.progressPct}%）`);
    const g = (st.nextBoss.context || {}).gameplay;
    if (g) L.push(`  打法要点（可讲，不含剧情）：${clip(g, 320)}`);
  }
  if (!guard && st.futureBosses.length) {
    L.push('再往后（玩家已关闭防剧透）：' + st.futureBosses.map(b => `${b.name}（${b.progressPct}%）`).join('；'));
  }

  const entries = game.entryPoints || [];
  if (entries.length) {
    L.push('', '# 入场点（本作推荐的切入位置）');
    entries.forEach(e => L.push(`- ${e.progressPct}% ${e.label}`));
  }

  L.push('', '# 剧透边界');
  if (guard) {
    L.push(`玩家开启了防剧透。${pct}% 之后的剧情、结局、以及除上面「下一个」以外的${term}名字，一律不主动透露；玩家明确追问时，先提醒「这会剧透」并请其确认后再说。`);
  } else {
    L.push('玩家关闭了防剧透，可以讨论后续内容；涉及重大反转或结局前仍先提示一句。');
  }

  let out = L.join('\n');
  if (out.length > max) out = out.slice(0, max - 1) + '…';
  return out;
}
