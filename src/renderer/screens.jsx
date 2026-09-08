/* ============================================================
   游伴 YouBan · 界面
   层级：游戏库(home) → 进入某游戏 → 进度 / 历程 / 舆情
   ============================================================ */
// 头像占位（本地 SVG）。交付开发时替换为真实头像 URL 即可。
const AVATAR = 'assets/avatar-default.svg';

/* ════════════ 游戏库（home，层级最高） ════════════ */
function LibraryScreen({ games, gi, enter, onProfile }) {
  const cur = games[gi];
  return (
    <div className="yb-scroll">
      <div className="appbar lib-bar">
        <div><div className="ttl">我的游戏库</div><div className="sub">{games.length} 款 · 已同步</div></div>
        <button className="avatar-btn" onClick={onProfile}>
          <img src={AVATAR} alt="我的" onError={e => { e.target.style.display = 'none'; e.target.parentNode.classList.add('mono-fallback'); }} />
        </button>
      </div>

      <div className="lib">
        <div className="lib-hero interactive" onClick={() => enter(gi)}
          style={{ background: `linear-gradient(120deg, ${cur.theme.bg}, ${cur.theme.accent2})` }}>
          <img className="bg" src={cur.banner} alt="" onError={e => e.target.style.display = 'none'} />
          <div className="veil" />
          <div className="inner">
            <span className="tag accent resume"><Icon name="play" size={12} /> 继续游玩 · {cur.currentPct}%</span>
            <h2>{cur.titleMain}</h2>
            <div className="pct mono">{cur.titleSub} · 剩约 {remainHours(cur, cur.currentPct)} 小时</div>
          </div>
        </div>

        <div className="lib-sec-h"><div className="t">全部游戏</div><div className="c mono">已同步 Steam · WeGame</div></div>

        <div className="lib-grid">
          {games.map((g, i) => (
            <div key={g.id} className={'poster' + (i === gi ? ' sel' : '')} onClick={() => enter(i)}>
              <img src={g.poster} alt={g.titleMain} onError={e => { e.target.style.opacity = 0; }} />
              <div className="grad" />
              <div className="badge">{g.currentPct === 0 ? '未开始' : g.currentPct + '%'}</div>
              <div className="meta">
                <div className="nm">{g.short}</div>
                <div className="pb"><i style={{ width: Math.max(3, g.currentPct) + '%', background: g.theme.accent }} /></div>
              </div>
            </div>
          ))}
          <div className="poster add-tile">
            <Icon name="grid" size={24} />
            <div className="t">连接平台</div>
            <div className="m mono">Steam · WeGame</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════ 进度输入（手动 / Steam / 截图） ════════════ */
function ProgressInput({ game, value, setValue }) {
  const [m, setM] = useState('manual');
  const [sid, setSid] = useState('');
  /* Steam 地板模型（2026-07-28 拍板）：成就 = 进度下界证据，单向使用。
     floor.pct > 玩家选择 → 出可拒绝的校正提示；否则静默佐证。永不自动覆盖指针。 */
  const [floor, setFloor] = useState(null);      // 引擎结果（floorPct/unlocked/matched/error）
  const [floorBusy, setFloorBusy] = useState(false);
  const [floorErr, setFloorErr] = useState('');
  const [dismissed, setDismissed] = useState(false); // 玩家点了「保持不变」
  const FLOOR_MIN_MAP = 5;                       // 映射密度阈值：低于此只做橱窗、不画地板线
  const canFloor = game.ach.length >= FLOOR_MIN_MAP;
  const readSteam = async () => {
    setFloorErr(''); setFloor(null); setDismissed(false);
    const client = window.__YB_STEAM_MOCK__;
    const engine = window.YBSteamProgress;
    if (!client || !engine) { setFloorErr('Steam 数据通道未就绪'); return; }
    if (!/^\d{17}$/.test(sid.trim())) { setFloorErr('请输入 17 位 SteamID64（演示：76561190000000001）'); return; }
    setFloorBusy(true);
    try {
      const resp = await client.getPlayerAchievements(sid.trim(), game.appId);
      const raw = { achievements: game.ach.map(a => ({ steamId: a.id, name: a.name, progressPct: a.pct })) };
      setFloor(engine.progressFromAchievements(raw, resp));
    } catch (e) {
      setFloorErr('档案未找到（Mock 演示 ID 见占位符）');
    } finally { setFloorBusy(false); }
  };
  const chapterOf = (pct) => { const c = game.chapters.find(c => pct >= c.start && pct < c.end); return c ? c.name : null; };
  const tabs = [['manual', '手动选章节', 'pin'], ['steam', 'Steam 成就', 'trophy'], ['ai', '截图识别', 'camera']];
  return (
    <div className="input-card">
      <div className="ic-head"><Icon name="progress" size={15} /><span>更新进度</span></div>
      <div className="seg input-seg">
        {tabs.map(([k, n, ic]) => <button key={k} className={m === k ? 'on' : ''} onClick={() => setM(k)}><Icon name={ic} size={14} />{n}</button>)}
      </div>
      <div className="ic-body">
        {m === 'manual' && (
          <label className="select-wrap">
            <select value={game.chapters.find(c => value >= c.start && value < c.end)?.start ?? ''} onChange={e => setValue(parseInt(e.target.value))}>
              <option value="" disabled>— 选择当前所在章节 —</option>
              {game.chapters.map((c, i) => <option key={i} value={c.start}>{c.name}（{c.start}%）</option>)}
              <option value={100}>通关 ✓</option>
            </select>
            <Icon name="chevd" size={16} />
          </label>
        )}
        {m === 'steam' && (
          <div>
            <div className="steam-row">
              <input className="text-input" value={sid} onChange={e => setSid(e.target.value)} placeholder="Steam ID64: 76561190000000001（演示）" />
              <button className="btn btn-primary" disabled={floorBusy} onClick={readSteam}>{floorBusy ? '读取中…' : '读取'}</button>
            </div>
            {floorErr && <div className="sync-note">{floorErr}</div>}
            {!floor && !floorErr && <div className="sync-note">需要 Steam 档案公开 · 读取后成就仅作佐证，不会覆盖你的进度</div>}
            {floor && floor.error === 'PROFILE_PRIVATE' && (
              <div className="sync-note">该档案为私密，读不到成就 · 手动进度不受影响</div>
            )}
            {floor && !floor.error && (
              <div className="steam-floor">
                <div className="sync-note ok">
                  ✓ 已解锁 {floor.unlockedCount}/{floor.totalCount}
                  {floor.matchedAchievement ? ` · 最近里程碑：${floor.matchedAchievement.name}` : ' · 暂无剧情里程碑解锁'}
                </div>
                {/* 单向校正：只有证据下界高于玩家选择时才发声，且可拒绝 */}
                {canFloor && floor.floorPct > value && !dismissed && (
                  <div className="floor-prompt">
                    <div className="fp-text">
                      Steam 显示你已解锁「{floor.matchedAchievement.name}」，进度至少 {floor.floorPct}%
                      {chapterOf(floor.floorPct) ? `（${chapterOf(floor.floorPct)}）` : ''}。
                    </div>
                    <div className="fp-actions">
                      <button className="btn btn-primary" onClick={() => setValue(floor.floorPct)}>更新到 {floor.floorPct}%</button>
                      <button className="btn" onClick={() => setDismissed(true)}>保持不变</button>
                    </div>
                  </div>
                )}
                {canFloor && floor.floorPct <= value && floor.unlockedCount > 0 && (
                  <div className="sync-note">与你的进度一致（成就下界 {floor.floorPct}%）</div>
                )}
                {!canFloor && (
                  <div className="sync-note">该作剧情成就较少（{floor.totalCount} 条），仅作成就展示、不推算进度</div>
                )}
              </div>
            )}
          </div>
        )}
        {m === 'ai' && (
          <div className="ai-panel">
            <Icon name="camera" size={22} />
            <div><b>截图 AI 识别 · MVP 后期</b><span>上传游戏截图，接入 Claude Vision 自动识别当前进度</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════ 游戏简介 ════════════ */
function Overview({ game }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overview">
      <div className="ov-tagline serif">「 {game.tagline} 」</div>
      <div className={'ov-desc' + (open ? ' open' : '')}>{game.desc}</div>
      <button className="ov-more" onClick={() => setOpen(o => !o)}>{open ? '收起' : '展开简介'} <Icon name={open ? 'chevd' : 'chev'} size={13} /></button>
      <div className="ov-highlights">
        {game.highlights.map((h, i) => (
          <div key={i} className="ov-hl"><span className="ic"><Icon name="gem" size={12} /></span><span>{h.text}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ════════════ 进度主卡（进度 Tab） ════════════ */
function ProgressScreen({ game, value, setValue, openBoss, openEntry }) {
  const nextPeak = game.hype.find(p => p.pct > value);
  const curChap = game.chapters.find(c => value >= c.start && value < c.end) || game.chapters[game.chapters.length - 1];
  const [openCh, setOpenCh] = useState(curChap.name);
  useEffect(() => { setOpenCh(curChap.name); }, [game.id]);

  return (
    <div className="yb-scroll">
      <div className="banner" style={{ background: `linear-gradient(165deg, ${game.theme.accent2}, ${game.theme.bg} 70%)` }}>
        <img className="bg" src={game.banner} alt="" onError={e => e.target.style.display = 'none'} />
        <div className="scrim-top" /><div className="scrim-bot" />
        <div className="title-wrap">
          <div className="gname">{game.titleMain}</div>
          <div className="gsub">{game.titleSub} · {game.year}</div>
        </div>
        <div className="pct-badge"><b className="mono">{value}<i>%</i></b><span>已完成</span></div>
      </div>

      <div className="body">
        <ProgressInput game={game} value={value} setValue={setValue} />
        <Overview game={game} />

        <div className="stat-row">
          <div className="stat"><div className="k">已玩约</div><div className="v">{(game.hoursMain * value / 100).toFixed(1)}<small>h</small></div></div>
          <div className="stat"><div className="k">剩余约</div><div className="v accent">{((100 - value) / 100 * game.hoursMain).toFixed(1)}<small>h</small></div></div>
          <div className="stat"><div className="k">主线共</div><div className="v">~{game.hoursMain}<small>h</small></div></div>
        </div>

        <div className="prog-h"><div className="lbl">流程进度 · 拖动预览</div><div className="now mono">{curChap.name.split('·').pop().trim()}</div></div>
        <HypeProgress game={game} value={value} onChange={setValue} onBoss={openBoss} onEntry={openEntry} />

        {nextPeak ? (
          <div className="next-card">
            <div className="ic"><Icon name="flag" size={20} /></div>
            <div className="txt"><div className="a">下一个名场面</div><div className="b">{nextPeak.label}</div></div>
            <div className="d"><b className="mono">{((nextPeak.pct - value) / 100 * game.hoursMain).toFixed(1)}</b><span>小时后</span></div>
          </div>
        ) : (
          <div className="next-card"><div className="ic"><Icon name="flag" size={20} /></div>
            <div className="txt"><div className="a">已抵达终章</div><div className="b">享受结局</div></div></div>
        )}

        <div className="sec-h"><div className="t">全流程章节</div><div className="ln" /><div className="n mono">{game.chapters.length} 章</div></div>
        {game.chapters.map((c, i) => {
          const done = value >= c.end, cur = value >= c.start && value < c.end, open = openCh === c.name;
          return (
            <div key={i} className={'chap' + (done ? ' done' : '') + (cur ? ' cur' : '') + (open ? ' open' : '')}>
              <div className="chap-row" onClick={() => setOpenCh(open ? '' : c.name)}>
                <div className="dot" />
                <div className="info">
                  <div className="nm">{c.name}</div>
                  <div className="mt"><Icon name="pin" size={11} />{c.planet}</div>
                </div>
                <div className="rng mono">{c.start}–{c.end}%</div>
              </div>
              {open && (
                <div className="chap-detail">
                  <p className="plot">{c.plot}</p>
                  <p className="goals"><b><Icon name="target" size={13} />目标</b>{c.goals}</p>
                  <p className="chars"><b><Icon name="users" size={13} />新登场</b>{c.chars}</p>
                  <button className="btn btn-ghost jump" onClick={() => setValue(Math.round((c.start + c.end) / 2))}>跳到此章预览</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════ 主角成长历程（历程 Tab） ════════════ */
function JourneyScreen({ game, value, setValue }) {
  return (
    <div className="yb-scroll">
      <div className="appbar"><div><div className="sub">PROTAGONIST JOURNEY</div><div className="ttl">主角成长历程</div></div></div>
      <div className="journey">
        {game.journey.map((s, i) => {
          const done = value > s.pct, cur = Math.abs(value - s.pct) <= 8;
          return (
            <div key={i} className={'jstep' + (done ? ' done' : '') + (cur ? ' cur' : '')} onClick={() => setValue(s.pct)}>
              <div className="jrail"><div className="jdot" />{i < game.journey.length - 1 && <div className="jline" />}</div>
              <div className="jcontent">
                <div className="jpct mono">{s.pct}%</div>
                <div className="jevent">{s.event}</div>
                <div className="jdesc">{s.desc}</div>
                <div className="junlocks">{s.unlocks.map((u, k) => <span key={k} className="tag accent">{u}</span>)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════ 玩家舆情（舆情 Tab） ════════════ */
function SentimentScreen({ game }) {
  const s = game.sentiment, tier = tierOf(s.score);
  const fmtK = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n;
  const groups = [
    { t: '好评', cls: 'praise', icon: 'thumb', rot: false, data: s.praise },
    { t: '热议', cls: 'hot', icon: 'flame', rot: false, data: s.hot },
    { t: '差评', cls: 'crit', icon: 'thumb', rot: true, data: s.criticism },
  ];
  return (
    <div className="yb-scroll">
      <div className="appbar"><div><div className="sub">PLAYER SENTIMENT</div><div className="ttl">玩家舆情</div></div></div>
      <div className="senti">
        <div className="score-hero">
          <ScoreRing score={s.score} />
          <div className="score-meta"><div className="lvl" style={{ color: tier.c }}>{tier.t}</div>
            <div className="src mono">{s.source}</div><div className="note">{s.note}</div></div>
        </div>

        <div className="sec-h"><div className="t">玩家怎么说</div><div className="ln" /><div className="n mono">TOP 3</div></div>
        {s.quotes.map((q, i) => (
          <div key={i} className="quote">
            <div className="qmark">”</div>
            <p>{q.text}</p>
            <div className="ft"><span className="au">{q.author}</span><span className="up"><Icon name="thumb" size={13} />{fmtK(q.up)}</span></div>
          </div>
        ))}

        {groups.map(g => (
          <div key={g.cls} className="kw-group">
            <div className="gh"><span className={'gh-ic ' + g.cls}><Icon name={g.icon} size={13} style={g.rot ? { transform: 'rotate(180deg)' } : null} /></span>
              <span className="gh-t">{g.t}</span><span className="gh-n mono">{g.data.length}</span></div>
            <div className="kw-wrap">{g.data.map((k, i) => <span key={i} className="kw-chip">{k}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════ 我的（平台同步） ════════════ */
function MeScreen({ games, onClose, theme, setTheme, game, onConnect }) {
  const platforms = [
    { id: 'steam', n: 'Steam', d: '已连接 · 自动同步成就', on: true, c: '#9bc1d6' },
    { id: 'wegame', n: 'WeGame', d: '已连接', on: true, c: '#ea5413' },
    { id: 'playstation', n: 'PlayStation', d: '点击授权奖杯同步', on: false, c: '#4f8fde' },
    { id: 'epicgames', n: 'Epic Games', d: '点击授权', on: false, c: '#cfcfcf' },
  ];
  return (
    <div className="yb-scroll">
      <div className="appbar me-bar"><button className="round-btn" onClick={onClose}><Icon name="back" size={18} /></button>
        <div style={{ flex: 1, textAlign: 'center' }}><div className="ttl" style={{ fontSize: 18 }}>我的</div></div>
        <div style={{ width: 38 }} /></div>
      <div className="senti">
        <div className="profile-hero">
          <div className="avatar-lg"><img src={AVATAR} alt="" onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = '游'; }} /></div>
          <div><div className="lvl">天命玩家</div><div className="note" style={{ marginTop: 4 }}>陪伴 {games.length} 款 · 累计省去约 18 小时摸索</div></div>
        </div>

        <div className="sec-h"><div className="t">外观主题</div><div className="ln" /></div>
        <div className="set-row" onClick={() => setTheme(theme === 'game' ? 'light' : 'game')}>
          <div className="set-ic"><Icon name={theme === 'game' ? 'swatch' : 'sun'} size={18} /></div>
          <div className="set-txt"><div className="b">{theme === 'game' ? '游戏主题色' : '浅色（默认）'}</div>
            <div className="at">{theme === 'game' ? '跟随所选游戏的氛围配色' : '点击切换为当前游戏主题色'}</div></div>
          <div className={'switch' + (theme === 'game' ? ' on' : '')}><i /></div>
        </div>

        <div className="sec-h"><div className="t">平台同步</div><div className="ln" /></div>
        {platforms.map(p => (
          <div key={p.id} className="plat-row" onClick={() => onConnect && onConnect(p)}>
            <div className="plat-ic" style={{ background: 'color-mix(in oklab,' + p.c + ' 14%,transparent)', borderColor: 'color-mix(in oklab,' + p.c + ' 30%,transparent)' }}>
              <PlatformLogo id={p.id} color={p.c} size={24} /></div>
            <div className="plat-txt"><div className="b">{p.n}</div><div className="at mono" style={{ color: p.on ? '#6fb53e' : 'var(--txt-3)' }}>{p.d}</div></div>
            {p.on ? <span className="tag praise">已连接</span> : <span className="tag accent">连接</span>}
          </div>
        ))}

        <div className="sec-h"><div className="t">设置</div><div className="ln" /></div>
        {[['通知提醒', '高潮节点 / 新存档推送'], ['关于游伴', 'v0.1 · Off-Circle Studio']].map(([a, b]) => (
          <div key={a} className="plat-row">
            <div className="plat-txt"><div className="b">{a}</div><div className="at">{b}</div></div>
            <Icon name="chev" size={16} style={{ color: 'var(--txt-3)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════ 入场点详情抽屉（二级界面） ════════════ */
// 人物卡：头像插画位（可由开发替换为真实立绘）+ 姓名 + 身份
function CharCard({ name, role, game }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initial = (name.match(/[A-Za-z]/) ? name[0].toUpperCase() : name[0]);
  return (
    <div className="char-card">
      <div className="char-ava" style={{ background: `linear-gradient(140deg, hsl(${hue} 42% 44%), hsl(${(hue + 38) % 360} 48% 28%))` }}>
        <span>{initial}</span>
      </div>
      <div className="char-meta">
        <div className="cn">{name}</div>
        {role && <div className="cr">{role}</div>}
      </div>
    </div>
  );
}
function EntryDetail({ game, entry, onClose, onStart }) {
  if (!entry) return null;
  const pct = entry.pct;
  // 你将跳过的章节（用于前情提要）
  const skipped = game.chapters.filter(c => c.end <= pct);
  const entering = game.chapters.find(c => pct >= c.start && pct < c.end) || game.chapters[0];
  // 此时已拥有的能力
  const abilities = [];
  game.journey.filter(j => j.pct <= pct).forEach(j => (j.unlocks || []).forEach(u => { if (!abilities.includes(u)) abilities.push(u); }));
  // 已登场关键人物（取跳过章节的新登场，去重）
  const seen = [];
  game.chapters.filter(c => c.start < pct).forEach(c => {
    (c.chars || '').split(/[、\n]/).forEach(s => {
      const t = s.trim(); if (!t) return;
      const m = t.match(/^([^（(：:]+)[（(：:]?\s*([^）)]*)/);
      const name = (m ? m[1] : t).trim();
      const role = (m && m[2] ? m[2] : '').replace(/[）)]+$/, '').trim();
      if (name && name.length <= 12 && !seen.some(o => o.name === name)) seen.push({ name, role });
    });
  });
  const chars = seen.slice(0, 8);
  // 已了结的 Boss
  const bossesPassed = game.bosses.filter(b => b.pct < pct).length;
  const hasDL = !!game.save;

  return (
    <>
      <div className="scrim show" onClick={onClose} style={{ zIndex: 103 }} />
      <div className="drawer themed show entry-drawer" style={{ zIndex: 104 }}>
        <div className="drawer-grip" />
        <div className="entry-detail-head">
          <button className="round-btn ed-close" onClick={onClose}><Icon name="x" size={16} /></button>
          <div className="ed-hours"><b className="mono">{remainHours(game, pct)}</b><span>小时通关</span></div>
          <div className="ed-titles">
            <div className="ed-eyebrow">入场点推荐 · 从 {pct}% 开始</div>
            <h3>{entry.label}</h3>
            <div className="ed-entering mono"><Icon name="pin" size={12} />进入《{entering.name}》</div>
          </div>
        </div>

        <div className="entry-detail-body">
          {/* 速览 */}
          <div className="ed-stats">
            <div className="ed-stat"><b className="mono">{pct}%</b><span>起始进度</span></div>
            <div className="ed-stat"><b className="mono">{skipped.length}</b><span>跳过章节</span></div>
            <div className="ed-stat"><b className="mono">{bossesPassed}</b><span>已了结 {(game.bossTerm || 'Boss').replace(/战$/, '').trim()}</span></div>
          </div>

          {/* 前情提要 */}
          <div className="ed-sec"><div className="ed-sh"><Icon name="journey" size={14} /><span>开始前你需要知道</span></div>
            {skipped.length === 0
              ? <p className="ed-recap-empty">这是完整体验起点——无需补课，从第一帧开始亲历全部剧情。</p>
              : <div className="ed-recap">
                  {skipped.map((c, i) => (
                    <div key={i} className="ed-recap-row"><span className="rc-pct mono">{c.end}%</span>
                      <div><div className="rc-name">{c.name}</div><div className="rc-key">{c.key}</div></div></div>
                  ))}
                </div>}
          </div>

          {/* 你将进入 */}
          {entering && entering.plot && (
            <div className="ed-sec"><div className="ed-sh"><Icon name="pin" size={14} /><span>你将从这里进入 · {entering.name}</span></div>
              <p className="ed-reason">{entering.plot}</p>
            </div>
          )}

          {/* 已拥有能力 */}
          {abilities.length > 0 && (
            <div className="ed-sec"><div className="ed-sh"><Icon name="gem" size={14} /><span>此时你已拥有</span></div>
              <div className="ed-tags">{abilities.slice(0, 12).map((a, i) => <span key={i} className="tag accent">{a}</span>)}</div>
            </div>
          )}

          {/* 已登场人物 */}
          {chars.length > 0 && (
            <div className="ed-sec"><div className="ed-sh"><Icon name="mask" size={14} /><span>已登场的关键人物</span></div>
              <div className="char-grid">{chars.map((c, i) => <CharCard key={i} name={c.name} role={c.role} game={game} />)}</div>
            </div>
          )}

          {/* 为什么 */}
          <div className="ed-sec"><div className="ed-sh"><Icon name="flag" size={14} /><span>为什么从这里开始</span></div>
            <p className="ed-reason">{entry.reason}</p>
          </div>

          <div className="ed-tip"><Icon name="lock" size={12} /> {hasDL ? '可下载社区存档一键跳至此进度，或手动游玩至该节点。' : '本作暂无社区存档包，可使用游戏内章节选择直达该节点。'}</div>
        </div>

        <div className="drawer-cta">
          {hasDL && <button className="btn btn-ghost"><Icon name="dl" size={16} /> 下载存档</button>}
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onStart(pct); onClose(); }}><Icon name="play" size={15} /> 从这里开始预览</button>
        </div>
      </div>
    </>
  );
}

/* ════════════ Boss / 章节详情抽屉 ════════════ */
function BossDrawer({ game, boss, onClose }) {
  const [t, setT] = useState('plot');
  useEffect(() => { setT('plot'); }, [boss && boss.id]);
  if (!boss) return null;
  const GAP = ['', '剧情极少', '剧情少量', '剧情中等', '剧情大量', '全部缺失'];
  const tabs = [['plot', '剧情'], ['chars', '人物'], ['fight', '战斗'], ['save', '存档']];
  const hasDL = !!game.save;
  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="drawer themed show">
        <div className="drawer-grip" />
        <div className="drawer-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="planet"><Icon name="pin" size={13} />{boss.planet} · {boss.pct}%</div>
              <h3>{boss.name}</h3><div className="en serif">{boss.nameEn}</div>
            </div>
            <button className="round-btn" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
          <div className="gap">
            <span style={{ fontSize: 11, color: 'var(--txt-3)', letterSpacing: '.04em' }}>跳关补课 · {GAP[boss.gap]}</span>
            <div className="gap-dots">{Array.from({ length: 5 }).map((_, i) => <i key={i} className={i < boss.gap ? 'on' : ''} />)}</div>
            {boss.hi && <span className="tag hot" style={{ marginLeft: 'auto' }}><Icon name="star" size={11} /> 高光战</span>}
          </div>
        </div>
        <div className="drawer-seg"><div className="seg">{tabs.map(([k, n]) => <button key={k} className={t === k ? 'on' : ''} onClick={() => setT(k)}>{n}</button>)}</div></div>
        <div className="drawer-body" style={{ maxHeight: 250 }}>
          {t === 'plot' && <><h4>剧情背景</h4><p>{boss.plot}</p></>}
          {t === 'chars' && <><h4>登场人物</h4><p>{boss.chars}</p></>}
          {t === 'fight' && <><h4>战斗技巧</h4><p>{boss.fight}</p>
            <div className="tip"><Icon name="gem" size={12} /> 跳关后能力以存档点为准，部分技能可能已解锁或缺失，请参照战斗说明调整策略。</div></>}
          {t === 'save' && (hasDL ? (
            <><h4>社区存档 · 一键跳关</h4>
              {game.save.steps.map((s, i) => <div key={i} className="save-step"><span className="num">{i + 1}</span>{s}{i === 1 ? `（文件夹：${boss.nameEn}）` : ''}</div>)}
              <div className="save-path mono">{game.save.path}</div></>
          ) : (
            <><h4>跳关存档建议</h4>
              <p>本场战斗位于流程 {boss.pct}%，错过将跳过约 {boss.gap} 段关键剧情。</p>
              <div className="tip"><Icon name="gem" size={12} /> <b>{game.short}</b> 暂无社区共享存档包。建议手动游玩至该 Boss 前的存档点，或使用游戏内章节选择直达。社区日后发布存档将第一时间更新。</div></>
          ))}
        </div>
        <div className="drawer-cta">
          {t === 'save' && hasDL
            ? <><button className="btn btn-primary" style={{ flex: 2 }}><Icon name="dl" size={16} /> 下载全 Boss 存档包</button><button className="btn btn-ghost">复制路径</button></>
            : <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setT('save')}>查看跳关存档建议</button>}
        </div>
      </div>
    </>
  );
}

/* ════════════ 开屏页 ════════════ */
function SplashScreen({ onEnter }) {
  return (
    <div className="splash">
      <div className="splash-glow" />
      <div className="splash-core">
        <Logo size={104} />
        <div className="splash-word">游伴 <span>YouBan</span></div>
        <div className="splash-tag serif">像看进度条一样，掌握整个旅程</div>
      </div>
      <div className="splash-foot">
        <button className="btn btn-primary splash-btn" onClick={onEnter}>开始</button>
        <div className="splash-by">OFF-CIRCLE STUDIO</div>
      </div>
    </div>
  );
}

/* ════════════ 登录页 ════════════ */
function LoginScreen({ onLogin }) {
  const methods = [
    { id: 'wechat', n: '微信登录', c: '#07c160', primary: true },
    { id: 'steam', n: 'Steam 登录', logo: 'steam', c: '#9bc1d6' },
    { id: 'apple', n: 'Apple 登录', c: '#e8e0d0' },
    { id: 'phone', n: '手机号登录', c: '#b0a090' },
  ];
  return (
    <div className="login">
      <div className="login-top">
        <Logo size={66} glyph />
        <div className="login-h">欢迎来到游伴</div>
        <div className="login-sub">连接你的游戏平台，开启进度陪伴</div>
      </div>
      <div className="login-methods">
        {methods.map(m => (
          <button key={m.id} className={'login-btn' + (m.primary ? ' wechat' : '')} onClick={onLogin}>
            {m.logo ? <PlatformLogo id="steam" color={m.c} size={20} /> : <span className="login-dot" style={{ background: m.c }} />}
            {m.n}
          </button>
        ))}
      </div>
      <div className="login-terms">登录即代表同意《用户协议》与《隐私政策》</div>
    </div>
  );
}

/* ════════════ 平台连接 ════════════ */
function PlatformConnect({ platform, onClose, onDone }) {
  const steps = {
    steam: ['打开 Steam 隐私设置，将「游戏详情」设为公开', '复制你的 SteamID64', '粘贴到游伴并授权读取成就'],
    playstation: ['在 PSN 网页端登录账号', '授权游伴读取奖杯进度', '完成 OAuth 回跳'],
    wegame: ['打开 WeGame 客户端 → 账号设置', '扫码授权游伴', '同步游玩时长与进度'],
    epicgames: ['登录 Epic 账号', '授权游伴读取成就', '完成回跳'],
  }[platform.id] || ['登录账号', '授权游伴读取进度', '完成回跳'];
  return (
    <>
      <div className="scrim show" onClick={onClose} style={{ zIndex: 121 }} />
      <div className="drawer themed show" style={{ maxHeight: '78%', zIndex: 122 }}>
        <div className="drawer-grip" />
        <div className="connect-head">
          <div className="connect-ic" style={{ background: 'color-mix(in oklab,' + platform.c + ' 16%,transparent)', borderColor: 'color-mix(in oklab,' + platform.c + ' 32%,transparent)' }}>
            <PlatformLogo id={platform.id} color={platform.c} size={34} />
          </div>
          <div><h3>连接 {platform.n}</h3><div className="connect-sub">{platform.on ? '已连接 · 可重新授权' : '授权后自动同步进度与成就'}</div></div>
          <button className="round-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="connect-body">
          <div className="connect-steps">
            {steps.map((s, i) => <div key={i} className="save-step"><span className="num">{i + 1}</span>{s}</div>)}
          </div>
          <div className="tip"><Icon name="lock" size={12} /> 游伴仅读取你的游戏进度与成就，不会获取密码或好友数据。</div>
        </div>
        <div className="drawer-cta">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onDone}>
            {platform.id === 'wechat' ? '微信授权' : platform.on ? '重新授权' : '授权登录'}
          </button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { LibraryScreen, ProgressScreen, JourneyScreen, SentimentScreen, MeScreen, BossDrawer, EntryDetail, ProgressInput, Overview, SplashScreen, LoginScreen, PlatformConnect });
