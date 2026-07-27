/* ============================================================
   游伴 YouBan · 游戏数据校验（schema + 数值合理性）
   - 校验 src/data/games/*.json 每个文件结构与数值是否合理
   - 既可被单测 import（validateGame / validateAll），也可独立运行：
        node scripts/validate-games.js
     全部通过 exit 0；任一文件不通过打印「文件 + 字段」并 exit 1。
   字段集合参照 renderer/adapt.js 实际用到的字段。改了 JSON 字段名要同步这里。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'data', 'games');

/* ───────── 小工具 ───────── */
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isArr = (v) => Array.isArray(v);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* 校验单个游戏对象，返回错误字符串数组（空数组 = 通过）。fileName 仅用于错误前缀。 */
function validateGame(game, fileName) {
  const errs = [];
  const tag = fileName ? `[${fileName}]` : '';
  const E = (msg) => errs.push(`${tag} ${msg}`);

  if (!isObj(game)) { E('根对象不是 JSON 对象'); return errs; }

  /* —— 顶层 / 元字段 —— */
  if (!isStr(game.id)) E('缺少 id (string)');
  if (!isStr(game.name)) E('缺少 name (string)');
  if (!isStr(game.titleMain)) E('缺少 titleMain (string)');
  if (typeof game.titleSub !== 'string') E('缺少 titleSub (string，可空串)');
  if (!isStr(game.short)) E('缺少 short (string)');
  if (!isNum(game.totalHoursMain)) E('缺少 totalHoursMain (number)');
  if (!isStr(game.bannerUrl)) E('缺少 bannerUrl (string)');
  if (!isStr(game.posterUrl)) E('缺少 posterUrl (string)');
  if (!isNum(game.currentPct)) E('缺少 currentPct (number)');
  else if (game.currentPct < 0 || game.currentPct > 100) E(`currentPct 越界 (${game.currentPct})，应 0..100`);

  /* —— gameTheme —— */
  const t = game.gameTheme;
  if (!isObj(t)) E('缺少 gameTheme {bg,bgCard,accent,accent2,text}');
  else ['bg', 'bgCard', 'accent', 'accent2', 'text'].forEach(k => { if (!isStr(t[k])) E(`gameTheme.${k} 缺失或非字符串`); });

  /* —— overview —— */
  const ov = game.overview;
  if (!isObj(ov)) E('缺少 overview {tagline,description,highlights[]}');
  else {
    if (!isStr(ov.tagline)) E('overview.tagline 缺失');
    if (!isStr(ov.description)) E('overview.description 缺失');
    if (!isArr(ov.highlights) || ov.highlights.length === 0) E('overview.highlights[] 缺失或为空');
  }

  /* —— chapters —— */
  const chapters = game.chapters;
  if (!isArr(chapters) || chapters.length === 0) E('缺少 chapters[] 或为空');
  else {
    chapters.forEach((c, i) => {
      const ct = `chapters[${i}]`;
      if (!isObj(c)) { E(`${ct} 非对象`); return; }
      if (!isStr(c.name)) E(`${ct}.name 缺失`);
      if (!isStr(c.planet)) E(`${ct}.planet 缺失`);
      if (!isStr(c.plotDetail)) E(`${ct}.plotDetail 缺失`);
      if (!isStr(c.playerGoals)) E(`${ct}.playerGoals 缺失`);
      if (!isStr(c.newCharacters)) E(`${ct}.newCharacters 缺失`);
      if (!isStr(c.keyEvent)) E(`${ct}.keyEvent 缺失`);
      if (!isNum(c.progressStart)) E(`${ct}.progressStart 非数值`);
      if (!isNum(c.progressEnd)) E(`${ct}.progressEnd 非数值`);
      if (isNum(c.progressStart) && isNum(c.progressEnd) && !(c.progressStart < c.progressEnd))
        E(`${ct} 区间非法：progressStart(${c.progressStart}) 应 < progressEnd(${c.progressEnd})`);
      [c.progressStart, c.progressEnd].forEach(v => {
        if (isNum(v) && (v < 0 || v > 100)) E(`${ct} 进度 ${v} 越界，应 0..100`);
      });
    });
    /* 章节区间覆盖且不重叠：按 start 排序后应首尾相接，覆盖 [0,100] */
    const sorted = chapters.filter(c => isNum(c.progressStart) && isNum(c.progressEnd))
      .slice().sort((a, b) => a.progressStart - b.progressStart);
    if (sorted.length === chapters.length && sorted.length > 0) {
      if (sorted[0].progressStart !== 0) E(`章节未从 0 开始（首章 start=${sorted[0].progressStart}）`);
      if (sorted[sorted.length - 1].progressEnd !== 100) E(`章节未覆盖到 100（末章 end=${sorted[sorted.length - 1].progressEnd}）`);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].progressStart !== sorted[i - 1].progressEnd)
          E(`章节区间不连续/重叠：${sorted[i - 1].name}(…${sorted[i - 1].progressEnd}) → ${sorted[i].name}(${sorted[i].progressStart}…)`);
      }
    }
  }

  /* —— achievements（Steam 成就 → 进度下界映射表）——
     地板模型（2026-07-28）：成就是进度**下界**证据，唯一危险方向是「地板偏高」。
     故此处硬校验映射表自洽：progressPct 严格升序（顺序错 = max 取值即偏高）、
     steamId 非空且不重复、数值在界。映射表允许为空/缺失（该作无章节成就时合法降级）。 */
  if (game.achievements !== undefined) {
    if (!isArr(game.achievements)) E('achievements 存在但非数组');
    else {
      const seen = new Set();
      game.achievements.forEach((a, i) => {
        const at = `achievements[${i}]`;
        if (!isObj(a)) { E(`${at} 非对象`); return; }
        if (!isStr(a.steamId)) E(`${at}.steamId 缺失或空`);
        else if (seen.has(a.steamId)) E(`${at}.steamId 重复：${a.steamId}`);
        else seen.add(a.steamId);
        if (!isStr(a.name)) E(`${at}.name 缺失`);
        if (!isNum(a.progressPct)) E(`${at}.progressPct 非数值`);
        else if (a.progressPct < 0 || a.progressPct > 100) E(`${at}.progressPct ${a.progressPct} 越界，应 0..100`);
        if (i > 0 && isNum(a.progressPct) && isNum(game.achievements[i - 1].progressPct)
            && a.progressPct <= game.achievements[i - 1].progressPct)
          E(`${at} progressPct 非严格升序：${game.achievements[i - 1].progressPct} → ${a.progressPct}（顺序错会抬高进度下界）`);
      });
    }
  }

  /* —— bossSaves —— */
  if (!isArr(game.bossSaves)) E('缺少 bossSaves[]');
  else game.bossSaves.forEach((b, i) => {
    const bt = `bossSaves[${i}]`;
    if (!isObj(b)) { E(`${bt} 非对象`); return; }
    if (!isStr(b.name)) E(`${bt}.name 缺失`);
    if (!isNum(b.progressPct)) E(`${bt}.progressPct 非数值`);
    else if (b.progressPct < 0 || b.progressPct > 100) E(`${bt}.progressPct ${b.progressPct} 越界，应 0..100`);
    if (!isObj(b.context)) E(`${bt}.context 缺失`);
    else ['plot', 'characters', 'gameplay'].forEach(k => { if (!isStr(b.context[k])) E(`${bt}.context.${k} 缺失`); });
  });

  /* —— hypePeaks —— */
  if (!isArr(game.hypePeaks)) E('缺少 hypePeaks[]');
  else game.hypePeaks.forEach((p, i) => {
    const pt = `hypePeaks[${i}]`;
    if (!isObj(p)) { E(`${pt} 非对象`); return; }
    if (!isNum(p.progressPct)) E(`${pt}.progressPct 非数值`);
    else if (p.progressPct < 0 || p.progressPct > 100) E(`${pt}.progressPct ${p.progressPct} 越界，应 0..100`);
    if (!isStr(p.label)) E(`${pt}.label 缺失`);
    if (!isNum(p.score)) E(`${pt}.score 非数值`);
  });

  /* —— entryPoints —— */
  if (!isArr(game.entryPoints)) E('缺少 entryPoints[]');
  else game.entryPoints.forEach((e, i) => {
    const et = `entryPoints[${i}]`;
    if (!isObj(e)) { E(`${et} 非对象`); return; }
    if (!isNum(e.progressPct)) E(`${et}.progressPct 非数值`);
    else if (e.progressPct < 0 || e.progressPct > 100) E(`${et}.progressPct ${e.progressPct} 越界，应 0..100`);
    if (!isStr(e.label)) E(`${et}.label 缺失`);
    if (!isStr(e.reason)) E(`${et}.reason 缺失`);
  });

  /* —— protagonistJourney —— */
  if (!isArr(game.protagonistJourney)) E('缺少 protagonistJourney[]');
  else game.protagonistJourney.forEach((j, i) => {
    const jt = `protagonistJourney[${i}]`;
    if (!isObj(j)) { E(`${jt} 非对象`); return; }
    if (!isNum(j.progressPct)) E(`${jt}.progressPct 非数值`);
    else if (j.progressPct < 0 || j.progressPct > 100) E(`${jt}.progressPct ${j.progressPct} 越界，应 0..100`);
    if (!isStr(j.event)) E(`${jt}.event 缺失`);
    if (!isStr(j.description)) E(`${jt}.description 缺失`);
    if (!isArr(j.unlocks)) E(`${jt}.unlocks[] 缺失`);
  });

  /* —— playerSentiment —— */
  const ps = game.playerSentiment;
  if (!isObj(ps)) E('缺少 playerSentiment {steamScore,keywords,testimonials}');
  else {
    if (!isNum(ps.steamScore)) E('playerSentiment.steamScore 非数值');
    else if (ps.steamScore < 0 || ps.steamScore > 100) E(`playerSentiment.steamScore ${ps.steamScore} 越界，应 0..100`);
    const kw = ps.keywords;
    if (!isObj(kw)) E('playerSentiment.keywords 缺失');
    else ['praise', 'criticism', 'hot'].forEach(k => { if (!isArr(kw[k])) E(`playerSentiment.keywords.${k}[] 缺失`); });
    if (!isArr(ps.testimonials)) E('playerSentiment.testimonials[] 缺失');
    else ps.testimonials.forEach((q, i) => {
      const qt = `playerSentiment.testimonials[${i}]`;
      if (!isObj(q)) { E(`${qt} 非对象`); return; }
      if (!isStr(q.text)) E(`${qt}.text 缺失`);
      if (!isStr(q.author)) E(`${qt}.author 缺失`);
      if (!isNum(q.upvotes)) E(`${qt}.upvotes 非数值`);
    });
  }

  return errs;
}

/* 读取目录下所有 *.json，返回 [{file, game}]。 */
function loadGameFiles(dir) {
  dir = dir || GAMES_DIR;
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => ({
    file: f,
    game: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
  }));
}

/* 校验整个目录，返回 [{file, errors}]。 */
function validateAll(dir) {
  return loadGameFiles(dir).map(({ file, game }) => ({ file, errors: validateGame(game, file) }));
}

module.exports = { GAMES_DIR, validateGame, loadGameFiles, validateAll, isStr, isNum, isArr, isObj };

/* ───────── CLI ───────── */
if (require.main === module) {
  let results;
  try {
    results = validateAll(GAMES_DIR);
  } catch (e) {
    console.error('校验失败：无法读取/解析游戏数据 →', e.message);
    process.exit(1);
  }
  let total = 0, bad = 0;
  for (const { file, errors } of results) {
    total++;
    if (errors.length) {
      bad++;
      console.error(`✗ ${file}`);
      errors.forEach(msg => console.error('   ' + msg));
    } else {
      console.log(`✓ ${file}`);
    }
  }
  if (bad) {
    console.error(`\n校验未通过：${bad}/${total} 个文件有问题。`);
    process.exit(1);
  }
  console.log(`\n全部通过：${total} 个游戏数据文件 schema/数值合理。`);
  process.exit(0);
}
