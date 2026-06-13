// ── GAME DATA ─────────────────────────────────────────────────
let GAME       = null;
let CHAPTERS   = [];
let PEAKS      = [];
let BOSS_SAVES = [];
let ACH_MAP    = {};   // steamId → progressPct
let TOTAL_H    = 17;
let BOSS_DL    = {};

let currentPct   = 7;
let activeBossId = null;
let currentGameId = 'jedi_fo';

// ── BOOTSTRAP ─────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await buildGameSelector();
  await switchGame('jedi_fo');
  window.addEventListener('resize', drawWave);
});

// ── GAME SELECTOR ─────────────────────────────────────────────
async function buildGameSelector() {
  let gameList = [];
  if (window.gameAPI && window.gameAPI.getGameList) {
    try { gameList = await window.gameAPI.getGameList(); } catch(e) {}
  }
  if (!gameList.length) {
    gameList = [
      { id: 'jedi_fo',           name: 'Star Wars Jedi: Fallen Order', year: 2019,
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1172380/library_600x900.jpg' },
      { id: 'black_myth_wukong', name: '黑神话：悟空',                 year: 2024,
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2358720/library_600x900.jpg' },
      { id: 'max_payne_3',       name: 'Max Payne 3',                  year: 2012,
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/204100/library_600x900.jpg' },
      { id: 'last_of_us_1',     name: 'The Last of Us Part I',        year: 2023,
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1888930/library_600x900.jpg' },
      { id: 'last_of_us_2',     name: 'The Last of Us Part II',       year: 2025,
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1230140/library_600x900.jpg' },
    ];
  }
  const list = document.getElementById('gsList');
  list.innerHTML = '';
  gameList.forEach(g => {
    const card = document.createElement('div');
    card.className = 'gs-card' + (g.id === currentGameId ? ' active' : '');
    card.id = 'gs-' + g.id;
    card.innerHTML = `
      <img class="gs-card-img" src="${g.posterUrl}" alt="${g.name}"
           onerror="this.style.background='#1a1a1a'">
      <div class="gs-card-name">${g.name}</div>
    `;
    card.addEventListener('click', () => switchGame(g.id));
    list.appendChild(card);
  });
}

async function switchGame(gameId) {
  if (gameId === currentGameId && GAME) return;
  currentGameId = gameId;
  currentPct    = 7;
  activeBossId  = null;
  closeBossPanel();

  // update selector highlight
  document.querySelectorAll('.gs-card').forEach(c => {
    c.classList.toggle('active', c.id === 'gs-' + gameId);
  });

  await loadGameData(gameId);
  buildTicks();
  buildPeaks();
  buildBossSaves();
  buildEntryPoints();
  buildOverview();
  buildChList();
  buildProtagonistJourney();
  buildPlayerSentiment();
  drawWave();
  updateDisplay(currentPct);
}

async function loadGameData(gameId) {
  gameId = gameId || currentGameId || 'jedi_fo';
  if (window.gameAPI) {
    try {
      GAME       = await window.gameAPI.getGameData(gameId);
      CHAPTERS   = GAME.chapters;
      PEAKS      = GAME.hypePeaks;
      BOSS_SAVES = GAME.bossSaves || [];
      BOSS_DL    = GAME.saveDownload || {};
      TOTAL_H    = GAME.totalHoursMain;
      ACH_MAP    = Object.fromEntries(GAME.achievements.map(a => [a.steamId, a.progressPct]));

      document.getElementById('gameName').innerHTML   = GAME.name.replace(':', ':<br>');
      document.getElementById('gameTags').textContent = `${GAME.genre || '动作'} · ${GAME.developer} · ${GAME.year}`;
      document.getElementById('bannerImg').src = GAME.bannerUrl;
      document.getElementById('posterImg').src = GAME.posterUrl;

      // Apply per-game CSS theme vars if gameTheme is defined
      if (GAME.gameTheme) {
        const r = document.documentElement;
        r.style.setProperty('--game-bg',      GAME.gameTheme.bg);
        r.style.setProperty('--game-bg-card', GAME.gameTheme.bgCard);
        r.style.setProperty('--game-accent',  GAME.gameTheme.accent);
        r.style.setProperty('--game-accent2', GAME.gameTheme.accent2);
        r.style.setProperty('--game-text',    GAME.gameTheme.text);
      }
      // Update game theme label in switcher
      const gameBtn = document.querySelector('.theme-btn:last-child');
      if (gameBtn) gameBtn.textContent = `🎮 ${(GAME.id||'').split('_')[0].toUpperCase().slice(0,4) || 'GAME'}`;
      return;
    } catch (err) {
      console.error('Failed to load game data via IPC:', err);
    }
  }
  // Fallback: inline defaults
  CHAPTERS = [
    { id:0, name:"序章：逃离 Bracca",     planet:"Bracca",          progressStart:0,  progressEnd:5,   hypeScore:7,  keyEvent:"Cal 逃离星球，与 Cere & Greez 相遇" },
    { id:1, name:"第一章：Bogano 地窖",    planet:"Bogano",          progressStart:5,  progressEnd:15,  hypeScore:5,  keyEvent:"结识 BD-1，Cordova 全息信息揭示任务" },
    { id:2, name:"第二章：Eilram 墓穴",    planet:"Zeffo",           progressStart:15, progressEnd:30,  hypeScore:6,  keyEvent:"重拾原力推动能力" },
    { id:3, name:"第三章：解救乌基族",     planet:"Kashyyyk",        progressStart:30, progressEnd:45,  hypeScore:7,  keyEvent:"遇见 Saw Gerrera，攀登巨树" },
    { id:4, name:"第四章：Miktrull 墓穴",  planet:"Dathomir / Zeffo",progressStart:45, progressEnd:62,  hypeScore:8,  keyEvent:"夜姐妹登场，双刀光剑解锁" },
    { id:5, name:"第五章：Ilum & Dathomir",planet:"Ilum / Dathomir", progressStart:62, progressEnd:80,  hypeScore:9,  keyEvent:"打造新光剑，击败 Malicos，Merrin 加入" },
    { id:6, name:"第六章：审判者要塞",     planet:"Nur",             progressStart:80, progressEnd:100, hypeScore:10, keyEvent:"击败第二姐妹，Darth Vader 追杀，毁掉 Holocron" },
  ];
  PEAKS = [
    { progressPct:3,  label:"逃离 Bracca",  score:7,  color:"#f97316" },
    { progressPct:12, label:"Cordova 揭示", score:5,  color:"#eab308" },
    { progressPct:44, label:"击败第九姐妹", score:8,  color:"#f97316" },
    { progressPct:55, label:"Cere 过去揭露",score:8,  color:"#a855f7" },
    { progressPct:65, label:"打造光剑",     score:6,  color:"#eab308" },
    { progressPct:76, label:"Merrin 加入",  score:6,  color:"#22c55e" },
    { progressPct:88, label:"击败第二姐妹", score:9,  color:"#ef4444" },
    { progressPct:93, label:"Vader 追杀",   score:10, color:"#ef4444" },
    { progressPct:98, label:"结局选择",     score:8,  color:"#a855f7" },
  ];
  ACH_MAP = {
    ACH_STORY_MANTIS:10, ACH_STORY_BOGANO:13, ACH_STORY_EILRAM:28,
    ACH_STORY_WOOKIE:43, ACH_STORY_NINTH:44,  ACH_STORY_MIKTRULL:57,
    ACH_STORY_SABER:66,  ACH_STORY_VAULT:85,  ACH_STORY_END:100,
  };
  // Fallback boss saves (subset)
  BOSS_SAVES = [
    { id:"ninth_sister",  name:"第九姐妹 — 源树顶端",          planet:"Kashyyyk", progressPct:44, storyGap:3, highlight:true,
      folder:"Ninth Sister Fight",
      context:{ plot:"Cal 攀登 Kashyyyk 源树顶端寻找乌基族酋长 Tarfful，被第九姐妹（Masana Tide）拦截。这是 Cal 第一次完整赢得对 Inquisitor 的全胜。", characters:"第九姐妹：Dowutin 种族 Inquisitor，力量型打法，双刃光剑。曾是绝地骑士，被帝国俘虏改造。", gameplay:"两阶段战斗。第一阶段双刃；第二阶段被砍断一臂后变得更激进。专注弹反她的重击预警动作，保持机动不要被逼到边缘。" } },
    { id:"taron_malicos", name:"Taron Malicos — 堕落的大师",    planet:"Dathomir", progressPct:73, storyGap:4, highlight:true,
      folder:"Taron Malicos Fight",
      context:{ plot:"前绝地大师 Taron Malicos 欺骗幸存夜姐妹 Merrin，利用她的仇恨统治 Dathomir。Cal 揭露谎言，Merrin 倒戈协助 Cal 决斗这位堕落的大师。战斗后 Merrin 正式加入团队。", characters:"Taron Malicos：双刃绿色光剑 + 岩石范围攻击的堕落大师。Merrin：从敌人变为盟友，用夜姐妹魔法固定 Malicos。", gameplay:"两阶段。Merrin 介入后她的魔法会定期固定 Malicos——那是最佳输出窗口，立刻猛打！" } },
    { id:"trilla_final",  name:"第二姐妹 终局 + Vader 追逐",    planet:"Nur",      progressPct:92, storyGap:5, highlight:true,
      folder:"Trilla Final Boss Fight",
      context:{ plot:"Cal 与 Trilla（第二姐妹）的最终决战。战斗中揭露她的悲剧身世。Vader 随后降临，亲手杀死 Trilla，再追杀 Cal 全队。Cal 最终销毁了全息晶体保护孩子们。", characters:"Trilla：从反派到悲剧人物。Cere：面对最深的罪与愧疚。Darth Vader：不是 Boss 而是一场灾难——走廊里的 Vader 几乎就是死亡本身。", gameplay:"第二姐妹阶段：专注弹反，不要贪刀。Vader 追逐阶段：纯粹逃跑，不要停下来战斗！" } },
  ];
  BOSS_DL = {
    url: "http://www.mediafire.com/file/obvapg7wvwuuk10/Jedi_Fallen_Order_Boss_Fight_Saves.zip/file",
    savePath: "C:/Users/{你的用户名}/Saved Games/Respawn/JediFallenOrder/",
    installSteps: ["下载 ZIP 并解压","进入对应 Boss 名称文件夹","重命名：Backup01.sav→Backup02.sav，SaveGame01.sav→SaveGame02.sav","复制到存档路径","启动游戏 → 读取游戏 → 选择存档槽"]
  };
}

// ── THEME ─────────────────────────────────────────────────────
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-btn').forEach((b, i) => {
    b.classList.toggle('active', ['light','dark','game'][i] === t);
  });
  setTimeout(drawWave, 50);
}

// ── HYPE WAVEFORM ─────────────────────────────────────────────
function hypeAt(pct) {
  let v = 0.12 + 0.06 * Math.sin(pct * 0.35) + 0.04 * Math.sin(pct * 1.1);
  for (const p of PEAKS) {
    const d = pct - p.progressPct;
    v += (p.score / 10) * 0.55 * Math.exp(-(d * d) / 28);
  }
  return Math.min(v, 1.0);
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawWave() {
  if (!PEAKS.length) return;
  const canvas = document.getElementById('hypeCanvas');
  const wrap   = canvas.parentElement;
  canvas.width  = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const colA  = getCSSVar('--hype-a')      || '#4f8ef740';
  const colB  = getCSSVar('--hype-b')      || '#a855f740';
  const grad  = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, colA);
  grad.addColorStop(1, colB);

  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x++) ctx.lineTo(x, H - hypeAt((x / W) * 100) * H * 0.88);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  const lA    = getCSSVar('--hype-line-a') || '#4f8ef7aa';
  const lB    = getCSSVar('--hype-line-b') || '#ef4444aa';
  const lGrad = ctx.createLinearGradient(0, 0, W, 0);
  lGrad.addColorStop(0, lA);
  lGrad.addColorStop(1, lB);
  ctx.beginPath();
  for (let x = 0; x <= W; x++) {
    const y = H - hypeAt((x / W) * 100) * H * 0.88;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = lGrad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const cx = (currentPct / 100) * W;
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── CHAPTER TICKS ─────────────────────────────────────────────
function buildTicks() {
  const c = document.getElementById('chTicks');
  c.innerHTML = '';
  CHAPTERS.forEach(ch => {
    const d = document.createElement('div');
    d.className = 'ch-tick';
    d.style.left = ch.progressStart + '%';
    c.appendChild(d);
  });
}

// ── HYPE PEAK MARKERS ─────────────────────────────────────────
function buildPeaks() {
  const row = document.getElementById('hypeRow');
  row.innerHTML = '';
  PEAKS.forEach(p => {
    const el = document.createElement('div');
    el.className = 'peak-marker';
    el.style.left = p.progressPct + '%';
    const sz = 5 + (p.score / 10) * 5;
    el.innerHTML = `
      <div class="peak-dot" style="width:${sz}px;height:${sz}px;border-color:${p.color};background:${p.color}33;border-width:${p.score>=9?2:1.5}px"></div>
      <div class="peak-label" style="color:${p.color}">${p.label}</div>
    `;
    el.addEventListener('mouseenter', e => showTT(e, p.label, `进度 ${p.progressPct}% · 热度 ${'★'.repeat(Math.round(p.score/2))}${'☆'.repeat(5-Math.round(p.score/2))}`));
    el.addEventListener('mouseleave', hideTT);
    row.appendChild(el);
  });
}

// ── DISPLAY UPDATE ────────────────────────────────────────────
function updateDisplay(pct) {
  currentPct = pct;
  document.getElementById('pctNum').textContent  = pct + '%';
  document.getElementById('barFill').style.width = pct + '%';

  const played = (pct / 100 * TOTAL_H).toFixed(1);
  const remain = ((100 - pct) / 100 * TOTAL_H).toFixed(1);
  document.getElementById('playedH').textContent = played + 'h';
  document.getElementById('remainH').textContent = remain + 'h';

  const next = PEAKS.find(p => p.progressPct > pct);
  if (next) {
    document.getElementById('milestoneCard').style.display = 'flex';
    document.getElementById('milestoneName').textContent   = next.label;
    const etaH = ((next.progressPct - pct) / 100 * TOTAL_H).toFixed(1);
    document.getElementById('milestoneEta').textContent    = '~' + etaH + 'h';
  } else {
    document.getElementById('milestoneCard').style.display = 'none';
  }

  buildChList();
  buildProtagonistJourney();
  drawWave();
}

function setProgress(v)    { updateDisplay(Math.max(0, Math.min(100, Math.round(v)))); }
function setProgressVal(v) { if (v) setProgress(parseInt(v)); }
function seekBar(e) {
  const r = document.getElementById('barWrap').getBoundingClientRect();
  setProgress(Math.round(((e.clientX - r.left) / r.width) * 100));
}

// ── BOSS SAVES ────────────────────────────────────────────────
function buildBossSaves() {
  const row = document.getElementById('bossRow');
  row.innerHTML = '';
  BOSS_SAVES.forEach(b => {
    const el = document.createElement('div');
    el.className = 'boss-marker' + (b.highlight ? ' highlight' : '');
    el.id = 'bm-' + b.id;
    el.style.left = b.progressPct + '%';
    const icon = b.highlight ? '⚔️' : '⚔';
    el.innerHTML = `
      <div class="boss-marker-icon">${icon}</div>
      <div class="boss-marker-label">${b.name}</div>
    `;
    el.addEventListener('click', () => showBossPanel(b));
    row.appendChild(el);
  });
}

const GAP_LABELS = ['', '剧情极少', '剧情少量', '剧情中等', '剧情大量', '全部缺失'];
const GAP_CLASS  = ['', 'gap-1',   'gap-2',    'gap-3',    'gap-4',    'gap-5'  ];

function showBossPanel(boss) {
  // toggle off if same boss clicked again
  if (activeBossId === boss.id) { closeBossPanel(); return; }
  activeBossId = boss.id;

  // clear active state from all markers
  document.querySelectorAll('.boss-marker').forEach(m => m.classList.remove('active'));
  const marker = document.getElementById('bm-' + boss.id);
  if (marker) marker.classList.add('active');

  // fill header
  document.getElementById('bcpName').textContent   = boss.name;
  document.getElementById('bcpPlanet').textContent  = '🪐 ' + boss.planet + '  ·  进度 ' + boss.progressPct + '%';

  const badge = document.getElementById('bcpGap');
  badge.textContent = '跳关补课：' + GAP_LABELS[boss.storyGap];
  badge.className   = 'bcp-gap-badge ' + GAP_CLASS[boss.storyGap];

  // fill panes
  document.getElementById('bcp-plot').innerHTML =
    `<p class="bcp-text">${boss.context.plot}</p>`;

  document.getElementById('bcp-chars').innerHTML =
    `<p class="bcp-text">${boss.context.characters}</p>`;

  document.getElementById('bcp-fight').innerHTML =
    `<p class="bcp-text">${boss.context.gameplay}</p>
     <div class="bcp-tip">💡 跳关后 Cal 的能力状态以存档点为准，部分技能可能已解锁或缺失，请参照战斗说明适时调整策略。</div>`;

  if (BOSS_DL && BOSS_DL.url) {
    // Support both installSteps array and instructions string
    let stepsArr = BOSS_DL.installSteps;
    if (!stepsArr && BOSS_DL.instructions) {
      stepsArr = BOSS_DL.instructions.split('\n').filter(s => s.trim());
    }
    stepsArr = stepsArr || [];
    const steps = stepsArr.map((s, i) =>
      `<div class="bcp-install-step">
         <div class="bcp-step-num">${i+1}</div>
         <span>${s.replace(/^\d+\.\s*/,'')}${i===1 ? `（文件夹：<b>${boss.folder}</b>）` : ''}</span>
       </div>`
    ).join('');
    document.getElementById('bcp-save').innerHTML =
      `${steps}
       <div class="bcp-path">${BOSS_DL.savePath || ''}</div>
       <a class="bcp-dl-btn" href="${BOSS_DL.url}" target="_blank">⬇️ 下载全 Boss 存档包（Mediafire）</a>`;
  } else {
    document.getElementById('bcp-save').innerHTML =
      `<div class="bcp-tip" style="margin-top:0">
         💡 <b>${GAME ? GAME.name : '此游戏'}</b> 目前暂无社区共享存档包。<br><br>
         建议方法：手动游玩至该 Boss 战前的存档点，或使用游戏内置的章节选择功能（如有）直接跳至对应章节。
       </div>
       <p class="bcp-text" style="margin-top:12px;font-size:11px;color:var(--text-muted)">
         若社区日后发布存档，我们会第一时间更新此版块。
       </p>`;
  }

  // reset to plot tab
  switchBcpTab('plot');

  // show panel
  const panel = document.getElementById('bossPanel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeBossPanel() {
  activeBossId = null;
  document.getElementById('bossPanel').style.display = 'none';
  document.querySelectorAll('.boss-marker').forEach(m => m.classList.remove('active'));
}

function switchBcpTab(id) {
  const ids = ['plot', 'chars', 'fight', 'save'];
  document.querySelectorAll('.bcp-tab').forEach((b, i) => b.classList.toggle('active', ids[i] === id));
  document.querySelectorAll('.bcp-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('bcp-' + id).classList.add('active');
}

// ── TABS ──────────────────────────────────────────────────────
function switchTab(id) {
  const ids = ['manual','steam','ai'];
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', ids[i] === id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
}

// ── STEAM MOCK ────────────────────────────────────────────────
function mockSteam() {
  const mockAch = [
    { apiname:'ACH_STORY_MANTIS',  achieved:1 },
    { apiname:'ACH_STORY_BOGANO',  achieved:1 },
    { apiname:'ACH_STORY_EILRAM',  achieved:1 },
    { apiname:'ACH_STORY_WOOKIE',  achieved:1 },
    { apiname:'ACH_STORY_NINTH',   achieved:0 },
  ];
  let maxPct = 0;
  mockAch.forEach(a => { if (a.achieved) maxPct = Math.max(maxPct, ACH_MAP[a.apiname] || 0); });
  if (maxPct) {
    setProgress(maxPct);
    console.log(`[Steam mock] Unlocked 4/10 story achievements → progress set to ${maxPct}%`);
  }
}

// ── TOOLTIP ───────────────────────────────────────────────────
function showTT(e, title, body) {
  const tt = document.getElementById('tooltip');
  document.getElementById('ttTitle').textContent = title;
  document.getElementById('ttBody').textContent  = body;
  tt.style.display = 'block';
  positionTT(e);
}
function hideTT() { document.getElementById('tooltip').style.display = 'none'; }
function positionTT(e) {
  const tt = document.getElementById('tooltip');
  tt.style.left = (e.clientX + 14) + 'px';
  tt.style.top  = (e.clientY - 8)  + 'px';
}
document.addEventListener('mousemove', e => {
  const tt = document.getElementById('tooltip');
  if (tt.style.display === 'block') positionTT(e);
});

// ── GAME OVERVIEW ─────────────────────────────────────────────
function buildOverview() {
  const section = document.getElementById('gameOverview');
  if (!GAME || !GAME.overview) { section.style.display = 'none'; return; }
  const ov = GAME.overview;
  document.getElementById('overviewTagline').textContent = ov.tagline || '';
  document.getElementById('overviewDesc').textContent    = ov.description || '';
  const hl = document.getElementById('overviewHighlights');
  hl.innerHTML = '';
  if (ov.highlights) {
    ov.highlights.forEach(h => {
      const chip = document.createElement('div');
      chip.className = 'ov-highlight';
      chip.innerHTML = `<span class="ov-icon">${h.icon}</span><span>${h.text}</span>`;
      hl.appendChild(chip);
    });
  }
  section.style.display = 'block';
}

// ── ENTRY POINTS ──────────────────────────────────────────────
function buildEntryPoints() {
  const row = document.getElementById('entryRow');
  row.innerHTML = '';
  if (!GAME || !GAME.entryPoints) return;
  GAME.entryPoints.forEach((ep, i) => {
    const el = document.createElement('div');
    el.className = 'entry-marker';
    el.style.left = ep.progressPct + '%';
    const labels = ['⭐ 起点', '⭐⭐ 进阶', '⭐⭐⭐ 高潮'];
    el.innerHTML = `
      <div class="entry-marker-icon">${labels[i] || '⭐'}</div>
      <div class="entry-marker-label">${ep.label}</div>
    `;
    el.addEventListener('mouseenter', e => showTT(e, ep.label, ep.reason));
    el.addEventListener('mouseleave', hideTT);
    row.appendChild(el);
  });
}

// ── PROTAGONIST JOURNEY ───────────────────────────────────────
function buildProtagonistJourney() {
  const card = document.getElementById('journeyCard');
  const list = document.getElementById('journeyList');
  if (!GAME || !GAME.protagonistJourney) { card.style.display = 'none'; return; }
  list.innerHTML = '';
  GAME.protagonistJourney.forEach(step => {
    const done    = currentPct > step.progressPct;
    const current = Math.abs(currentPct - step.progressPct) <= 8;
    const el = document.createElement('div');
    el.className = 'journey-step' + (done ? ' done' : current ? ' current' : '');
    const unlockPills = (step.unlocks || []).map(u =>
      `<span class="unlock-pill">${u}</span>`
    ).join('');
    el.innerHTML = `
      <div class="journey-pct">${step.progressPct}%</div>
      <div class="journey-line">
        <div class="journey-dot"></div>
      </div>
      <div class="journey-content">
        <div class="journey-event">${step.event}</div>
        <div class="journey-desc">${step.description}</div>
        <div class="journey-unlocks">${unlockPills}</div>
      </div>
    `;
    el.addEventListener('click', () => setProgress(step.progressPct));
    list.appendChild(el);
  });
  card.style.display = 'block';
}

// ── CHAPTER LIST (enriched) ───────────────────────────────────
function buildChList() {
  const list = document.getElementById('chList');
  list.innerHTML = '';
  CHAPTERS.forEach(ch => {
    const done    = currentPct > ch.progressEnd;
    const current = currentPct >= ch.progressStart && currentPct <= ch.progressEnd;
    const el = document.createElement('div');
    el.className = 'ch-row' + (done ? ' done' : current ? ' active' : '');
    el.onclick = () => setProgress(ch.progressStart + 2);

    const bars = Array.from({length:5}, (_, j) => {
      const h  = j < Math.round(ch.hypeScore / 2) ? Math.max(4, ch.hypeScore * 2) : 3;
      const op = j < Math.round(ch.hypeScore / 2) ? 1 : 0.18;
      return `<div class="hb" style="height:${h}px;opacity:${op}"></div>`;
    }).join('');

    // Build extra detail block if enriched data exists
    let detail = '';
    if (ch.plotDetail) {
      detail = `
        <div class="ch-detail">
          <div class="ch-detail-plot">${ch.plotDetail}</div>
          ${ch.playerGoals ? `<div class="ch-detail-goals"><b>🎯 目标：</b>${ch.playerGoals}</div>` : ''}
          ${ch.newCharacters ? `<div class="ch-detail-chars"><b>👥 新登场：</b>${ch.newCharacters}</div>` : ''}
        </div>`;
    }

    el.innerHTML = `
      <div class="ch-dot ${done?'done':current?'current':'pending'}"></div>
      <div class="ch-info">
        <div class="ch-name">${ch.name}</div>
        <div class="ch-planet">🪐 ${ch.planet}</div>
        ${detail}
      </div>
      <div class="ch-hype">${bars}</div>
      <div class="ch-pct">${ch.progressStart}–${ch.progressEnd}%</div>
    `;
    el.addEventListener('mouseenter', e => showTT(e, ch.name, ch.keyEvent));
    el.addEventListener('mouseleave', hideTT);
    list.appendChild(el);
  });
}

// ── PLAYER SENTIMENT ─────────────────────────────────────────
function buildPlayerSentiment() {
  const card = document.getElementById('sentimentCard');
  if (!GAME || !GAME.playerSentiment) { card.style.display = 'none'; return; }
  const ps = GAME.playerSentiment;

  // Score bar
  const score = ps.steamScore || 0;
  const barEl = document.getElementById('sentimentBar');
  document.getElementById('sentimentScore').textContent  = score + '%';
  barEl.style.width  = score + '%';
  barEl.className    = 'sentiment-bar-fill' +
    (score >= 80 ? ' positive' : score >= 60 ? ' mixed' : ' negative');
  document.getElementById('sentimentSource').textContent = ps.source || '';
  document.getElementById('sentimentNote').textContent   = ps.note   || '';

  // ── Testimonials ──────────────────────────────────────────
  const tmArea = document.getElementById('sentimentTestimonials');
  tmArea.innerHTML = '';
  const quotes = (ps.testimonials || []).slice(0, 3); // show top 3
  quotes.forEach(q => {
    const el = document.createElement('div');
    el.className = 'tm-card';
    el.innerHTML = `
      <div class="tm-quote">${q.text}</div>
      <div class="tm-meta">
        <span class="tm-author">${q.author}</span>
        <span class="tm-upvotes">👍 ${q.upvotes >= 1000
          ? (q.upvotes / 1000).toFixed(1) + 'k'
          : q.upvotes}</span>
      </div>`;
    tmArea.appendChild(el);
  });

  // ── Keyword tags ──────────────────────────────────────────
  const groups = [
    { key: 'praise',    label: '👍 好评',   cls: 'kw-praise'   },
    { key: 'criticism', label: '👎 差评',   cls: 'kw-criticism' },
    { key: 'hot',       label: '🔥 热议',   cls: 'kw-hot'      },
  ];
  const kwArea = document.getElementById