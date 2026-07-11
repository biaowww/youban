/* ============================================================
   游伴 v10 新版 UI（feature/v10-ui）
   来源：design/游伴 v10 新版UI完整稿.html + design/v10-新版UI-实施说明.md
   边界（铁律）：
   - 只重做 进度/历程 两个一级 Tab 的呈现层；舆情沿用 v9 SentimentScreen
   - 二级抽屉（BossDrawer/EntryDetail）复用 v9，本文件只负责“打开”
   - 数据全部来自 adaptGame() 视图模型，不碰 schema
   - v9 组件只加不改；本文件是唯一新增 UI 入口，经 app.jsx 开关挂载
   hooks（useState 等）由 components.js 全局声明，直接复用。
   ============================================================ */

/* ───────── 历程 Tab：蜿蜒旅程图（步骤 2，v10-C 定稿 + v10-B 里程碑元素） ───────── */
const V10_ICONS = ['🛠', '🤖', '⚔', '🤝', '🏛', '🌟', '🔥', '🗝'];

function V10Journey({ game, value, openBoss, openEntry }) {
  const wrapRef = useRef(null);
  const baseRef = useRef(null);
  const trodRef = useRef(null);
  const youRef = useRef(null);
  const ptsRef = useRef([]);      // 各节点圆心坐标（相对 wrap）
  const pctsRef = useRef([]);     // 各节点对应进度
  const valRef = useRef(value);
  const [peeked, setPeeked] = useState({});

  /* 节点序列：里程碑(journey) + 推荐起点(entries)，按进度排序（同进度 🎁 在前） */
  const nodes = React.useMemo(() => {
    const ms = (game.journey || []).map((j, i) => ({ type: 'm', ...j, ico: V10_ICONS[i % V10_ICONS.length] }));
    const es = (game.entries || []).map(e => ({ type: 'e', ...e }));
    return [...ms, ...es].sort((a, b) => a.pct - b.pct || (a.type === 'e' ? -1 : 1));
  }, [game.id]);

  /* 里程碑 → 下一站进度、就近 ⚔ 存档（每段最多 1 个） */
  const milestonePcts = (game.journey || []).map(j => j.pct);
  const nextOf = (pct) => { const i = milestonePcts.indexOf(pct); return milestonePcts[i + 1] != null ? milestonePcts[i + 1] : 100; };
  const segBossOf = (pct) => (game.bosses || []).filter(b => b.pct >= pct && b.pct < nextOf(pct)).slice(0, 1);

  /* 路径绘制（量 DOM 圆心 → 三次贝塞尔） */
  const paint = () => {
    const base = baseRef.current, trod = trodRef.current, you = youRef.current;
    if (!base || !trod || !you || !base.getAttribute('d')) return;
    if (typeof base.getTotalLength !== 'function') return; // jsdom 等无 SVG 几何实现的环境
    const pts = ptsRef.current, pcts = pctsRef.current, pct = valRef.current;
    const total = base.getTotalLength();
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) * 1.02);
    const scale = total / Math.max(1e-6, lens[lens.length - 1]);
    let l = total;
    if (pct <= pcts[0]) l = 0;
    else {
      for (let i = 1; i < pcts.length; i++) {
        if (pct <= pcts[i]) { const t = (pct - pcts[i - 1]) / Math.max(1e-6, pcts[i] - pcts[i - 1]); l = (lens[i - 1] + t * (lens[i] - lens[i - 1])) * scale; break; }
      }
    }
    trod.setAttribute('stroke-dasharray', `${l} ${total}`);
    const p = base.getPointAtLength(l);
    you.style.left = p.x + 'px'; you.style.top = p.y + 'px';
    const lbl = you.querySelector('.yl'); if (lbl) lbl.textContent = `你在这里 · ${pct}%`;
  };

  const draw = () => {
    const wrap = wrapRef.current, base = baseRef.current, trod = trodRef.current;
    if (!wrap || !base || !trod) return;
    const r = wrap.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    base.ownerSVGElement.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    const pts = [], pcts = [];
    wrap.querySelectorAll('.j-row').forEach(row => {
      const d = row.querySelector('.j-dot'); if (!d) return;
      const b = d.getBoundingClientRect();
      pts.push({ x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top });
      pcts.push(+row.dataset.pct);
    });
    if (pts.length < 2) return;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2;
      d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
    }
    base.setAttribute('d', d); trod.setAttribute('d', d);
    ptsRef.current = pts; pctsRef.current = pcts;
    paint();
  };

  useEffect(() => {
    draw();
    const t1 = setTimeout(draw, 150), t2 = setTimeout(draw, 600); // 字体/图片落定后再校
    window.addEventListener('resize', draw);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', draw); };
  }, [game.id]);
  useEffect(() => { valRef.current = value; paint(); }, [value]);

  /* 当前里程碑 = 最后一个 pct<=value 的里程碑节点 */
  let curIdx = -1;
  nodes.forEach((n, i) => { if (n.type === 'm' && n.pct <= value) curIdx = i; });
  const STATE_TXT = { done: '已解锁', current: '进行中', future: '锁定' };

  return (
    <div className="journey-wrap" ref={wrapRef}>
      <svg className="route"><path className="base" ref={baseRef} /><path className="trod" ref={trodRef} /></svg>
      <div className="you" ref={youRef}><div className="avatar" /><div className="yl">你在这里 · {value}%</div></div>
      {nodes.map((n, i) => {
        const side = i % 2 === 0 ? 'L' : 'R';
        if (n.type === 'e') {
          const done = n.pct <= value;
          return (
            <div key={'e' + n.pct} className={`j-row entry-row ${side} ${done ? 'done' : 'future'}`} data-pct={n.pct}>
              <div className="e-card">
                <div className="el">🎁 {n.label}<span className="mono" style={{ fontSize: 10, opacity: .7 }}>{n.pct}%</span></div>
                <div className="ew">{n.reason}</div>
                <span className="go" onClick={() => openEntry && openEntry(n)}>{'从这里进入 →'}</span>
              </div>
              <div className="j-node"><div className="j-dot"><span>🎁</span></div><span className="j-pct mono">{n.pct}%</span></div>
            </div>
          );
        }
        const state = i === curIdx ? 'current' : (n.pct <= value ? 'done' : 'future');
        const nextPct = nextOf(n.pct);
        const seg = segBossOf(n.pct);
        const glW = state === 'done' ? 100 : state === 'future' ? 0 : Math.min(100, (value - n.pct) / Math.max(1, nextPct - n.pct) * 100);
        return (
          <div key={'m' + n.pct} className={`j-row ${side} ${state}${peeked[i] ? ' peeked' : ''}`} data-pct={n.pct}>
            <div className="j-card">
              {state === 'future' && <span className="peek" onClick={() => setPeeked(p => ({ ...p, [i]: !p[i] }))}>偷看一眼 👀</span>}
              <div className="ico">{n.ico}</div>
              <div className="bd2">
                <div className="ev">{n.event}<span className="st">{STATE_TXT[state]}</span></div>
                <div className="desc">{n.desc}</div>
                {n.unlocks.length > 0 && <div className="tags">{n.unlocks.map((u, k) => <span key={k} className="tag">✦ {u}</span>)}</div>}
                <div className="j-next"><div className="gl"><i style={{ width: glW + '%' }} /></div><span className="pc mono">{'→ 下一站 ' + nextPct + '%'}</span></div>
                {seg.length > 0 && (
                  <div className="j-save">{seg.map(b => (
                    <div key={b.id || b.pct} className={'sv' + (b.hi ? ' hi' : '') + (b.pct > value ? ' locked' : '')}>
                      <span className="swd">⚔</span>
                      <span className="n" onClick={() => openBoss && openBoss(b)}>就近存档 · {b.name}</span>
                      <span className="pc2 mono">{b.pct}%</span>
                      <button className="dl" onClick={() => openBoss && openBoss(b)}>⤓</button>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
            <div className="j-node"><div className="j-dot"><span>{state === 'current' ? '⟡' : state === 'done' ? '✓' : '◆'}</span></div><span className="j-pct mono">{n.pct}%</span></div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── 进度 Tab：Hype Wave + 渐变坐标轴 + 邻近里程碑（步骤 3） ───────── */
function V10Wave({ game, value, setValue, guard, openBoss, openEntry }) {
  const W = 440, H = 190, PB = 26, PT = 16;
  const X = (p) => p / 100 * W;
  const chapters = game.chapters;
  const peaks = game.hype || [];
  const bosses = game.bosses || [];
  const entries = game.entries || [];
  const svgRef = useRef(null);
  const barRef = useRef(null);

  /* 曲线：章节热度打底 + 峰值高斯叠加（同原型算法） */
  const { lineD, areaD, peakPts } = React.useMemo(() => {
    const chapHypeAt = (p) => { const c = chapters.find(c => p >= c.start && p < c.end) || chapters[chapters.length - 1]; return c.hype || 5; };
    const hypeAt = (p) => { let v = chapHypeAt(p) * .34; peaks.forEach(pk => { v += pk.score * Math.exp(-((p - pk.pct) ** 2) / (2 * 2.4 ** 2)); }); return Math.min(v, 11); };
    const Y = (v) => H - PB - v / 11 * (H - PB - PT);
    let d = '';
    for (let p = 0; p <= 100; p += .5) d += `${p === 0 ? 'M' : 'L'} ${X(p).toFixed(1)} ${Y(hypeAt(p)).toFixed(1)} `;
    return {
      lineD: d,
      areaD: d + `L ${W} ${H - PB} L 0 ${H - PB} Z`,
      peakPts: peaks.map(pk => ({ ...pk, x: X(pk.pct), y: Y(hypeAt(pk.pct)), hi: pk.score >= 8 })),
    };
  }, [game.id]);

  /* 邻近里程碑事件源：⚔Boss + 🔥名场面(hi) + ✦成长节点，合并时间线 */
  const events = React.useMemo(() => [
    ...bosses.map(b => ({ pct: b.pct, n: b.name, t: 'Boss 战', ic: '⚔', spoil: true })),
    ...peaks.filter(p => p.score >= 8).map(p => ({ pct: p.pct, n: p.label, t: '名场面', ic: '🔥', spoil: true })),
    ...(game.journey || []).map(j => ({ pct: j.pct, n: j.event, t: '成长节点', ic: '✦', spoil: false })),
  ].sort((a, b) => a.pct - b.pct), [game.id]);

  const clickJump = (e, el) => {
    const r = el.getBoundingClientRect();
    setValue(Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100))));
  };
  const safeTitle = (pct, name) => (guard && pct > value) ? `未至节点 · ${pct}%` : `${name} · ${pct}%`;

  const curCh = chapters.find(c => value >= c.start && value < c.end) || chapters[chapters.length - 1];
  const prevEv = [...events].reverse().find(e => e.pct <= value);
  const nextEvs = events.filter(e => e.pct > value).slice(0, 2);
  const nowX = Math.min(Math.max(X(value), 44), W - 44);
  const shortName = (c) => c.name.split(/[：:]/)[0];

  return (
    <>
      {/* Hype Wave */}
      <div className="wave-box">
        <svg ref={svgRef} className="wave" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          onClick={(e) => clickJump(e, svgRef.current)}>
          <defs>
            <linearGradient id="v10gLit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,160,240,.44)" /><stop offset="100%" stopColor="rgba(123,47,247,.05)" />
            </linearGradient>
            <linearGradient id="v10gDim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(138,125,102,.18)" /><stop offset="100%" stopColor="rgba(138,125,102,.02)" />
            </linearGradient>
            <clipPath id="v10clipLit"><rect x="0" y="0" width={X(value)} height={H} /></clipPath>
          </defs>
          {chapters.map((c, i) => (
            <rect key={i} x={X(c.start)} y={0} width={X(c.end) - X(c.start)} height={H - PB} className={'wv-band' + (i % 2 ? ' alt' : '')} />
          ))}
          <path d={areaD} className="wv-area-dim" />
          <path d={lineD} className="wv-line-dim" />
          <g clipPath="url(#v10clipLit)">
            <path d={areaD} className="wv-area-lit" />
            <path d={lineD} className="wv-line-lit" />
          </g>
          {bosses.map((b, i) => (
            <text key={'b' + i} x={X(b.pct)} y={H - 2} className={'wv-boss' + (b.pct > value ? ' future' : '')}
              onClick={(e) => { e.stopPropagation(); openBoss && openBoss(b); }}>
              <title>{safeTitle(b.pct, '⚔ ' + b.name)}</title>⚔
            </text>
          ))}
          {peakPts.map((pk, i) => (
            <g key={'p' + i} className={'wv-peak' + (pk.hi ? ' hi' : '') + (pk.pct > value ? ' future' : '')}
              onClick={(e) => { e.stopPropagation(); setValue(pk.pct); }}>
              <title>{safeTitle(pk.pct, pk.label)}</title>
              <circle cx={pk.x} cy={pk.y} r={pk.hi ? 6 : 4} />
              {pk.hi && <text x={pk.x} y={pk.y - 10}>{pk.label}</text>}
            </g>
          ))}
          <line x1={X(value)} x2={X(value)} y1={PT - 6} y2={H - PB} className="wv-now" />
          <text x={nowX} y={PT - 6} className="wv-now-lbl">你在这里 {value}%</text>
        </svg>
      </div>

      {/* 渐变坐标轴（与波形同 x 轴） */}
      <div className="axis">
        <div ref={barRef} className="bar" onClick={(e) => { if (e.target !== barRef.current && !e.target.classList.contains('fill') && !e.target.classList.contains('fillclip')) return; clickJump(e, barRef.current); }}>
          <div className="fillclip"><div className="fill" style={{ width: value + '%' }} /></div>
          {chapters.slice(1).map((c, i) => <div key={i} className="tick" style={{ left: c.start + '%' }} />)}
          {entries.map((en, i) => (
            <div key={i} className={'entry' + (en.pct <= value ? ' done' : '')} style={{ left: en.pct + '%' }}
              title={`🎁 ${en.label}（${en.pct}%）`} onClick={() => openEntry && openEntry(en)} />
          ))}
          <div className="youmk" style={{ left: value + '%' }} />
        </div>
        <div className="axis-cap">
          <span>{shortName(chapters[0])}</span>
          <b className="mono">{value}% · {curCh.name}</b>
          <span>{shortName(chapters[chapters.length - 1])}</span>
        </div>
      </div>

      {/* 邻近里程碑（刚走过 1 + 即将抵达 ≤2） */}
      <div className="nearby">
        {prevEv && (
          <div className="nb prev"><div className="ic">{prevEv.ic}</div>
            <div className="tt"><div className="tl">刚走过</div>
              <div className="nm">{prevEv.n}</div>
              <div className="mt2">{prevEv.t} · {prevEv.pct}%</div></div>
          </div>
        )}
        <div className="nb now"><div className="ic">⟡</div>
          <div className="tt"><div className="tl">此刻</div>
            <div className="nm">{curCh.name}</div>
            <div className="mt2">进度 {value}% · 已陪跑 {(value / 100 * game.hoursMain).toFixed(1)}h</div></div>
        </div>
        {nextEvs.map((e, i) => (
          <div key={i} className="nb next"><div className="ic">{e.ic}</div>
            <div className="tt"><div className="tl">{i === 0 ? '即将抵达' : '再往前'}</div>
              <div className={'nm' + (e.spoil ? ' spoil' : '')}>{e.n}</div>
              <div className="mt2">{e.t} · {e.pct}%</div></div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────── 全局态：防剧透 / 主题（步骤 6 会统一各模块模糊规则） ───────── */
function V10App({ game, games, value, setValue, onBack, onSwitchToV9, openBoss, openEntry }) {
  const [tab, setTab] = useState('progress');
  const [guard, setGuard] = useState(true);     // 防剧透默认开（原型默认 body.guard）
  const [dark, setDark] = useState(false);      // 浅色暖调默认
  const [solid, setSolid] = useState(false);    // 顶栏滚动加底
  const rootRef = useRef(null);

  const onScroll = () => {
    const el = rootRef.current; if (!el) return;
    setSolid(el.scrollTop > el.clientHeight * 0.3);
  };

  const played = value / 100 * game.hoursMain;
  const bossPassed = game.bosses.filter(b => b.pct <= value).length;
  const Senti = window.SentimentScreen;

  return (
    <div ref={rootRef} className={'v10' + (dark ? ' dark' : '') + (guard ? ' guard' : '')} onScroll={onScroll}>
      {/* 顶栏 */}
      <nav className={'topbar' + (solid ? ' solid' : '')}>
        <button className="t-back" onClick={onBack}>←</button>
        <div className="t-brand">
          <img src="assets/youban-mark.svg" alt="游伴" />
          <b>{game.short}</b>
        </div>
        <div className="t-tabs">
          {[['progress', '进度'], ['journey', '历程'], ['senti', '舆情']].map(([k, n]) => (
            <button key={k} className={'t-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{n}</button>
          ))}
        </div>
        <button className="t-ctl guard-t" title={guard ? '防剧透：开' : '防剧透：关'} onClick={() => setGuard(g => !g)}>🛡<span className="sw" /></button>
        <button className="t-ctl" title="浅色 / 游戏主题色" onClick={() => setDark(d => !d)}>{dark ? '☀' : '🌙'}</button>
        <button className="t-ctl" title="切回旧版界面" onClick={onSwitchToV9}>v9</button>
      </nav>

      {/* Hero 全出血（步骤 5 精修；骨架先按定稿结构立起来） */}
      <header className="hero">
        <img className="bg" src={game.banner} alt="" onError={e => { e.target.style.display = 'none'; }} />
        <div className="scrim" />
        <div className="inner">
          <div className="greet"><span className="dot" />欢迎回来 · 继续陪 <b>{game.short}</b> 走这段路</div>
          <h1>{game.titleMain}</h1>
          <div className="sub">{game.titleSub}</div>
          <div className="meta">
            {game.developer && <span className="chip">{game.developer}{game.year ? ' · ' + game.year : ''}</span>}
            {game.genre && <span className="chip">{game.genre}</span>}
            {game.tagline && <span className="chip gold">⚡ {game.tagline}</span>}
          </div>
          <div className="hero-foot">
            <button className="cta primary" onClick={() => setTab('progress')}>{'▶ 继续旅程'}</button>
            <div className="hero-stats">
              <div className="hstat"><b>{value}<small>%</small></b><span>完成度</span></div>
              <div className="hstat"><b>{played.toFixed(1)}<small>h</small></b><span>已陪跑</span></div>
              <div className="hstat"><b>{Math.max(0, game.hoursMain - played).toFixed(1)}<small>h</small></b><span>剩余(主线)</span></div>
              <div className="hstat"><b>{bossPassed}<small>/{game.bosses.length}</small></b><span>Boss 已过</span></div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* 进度 Tab：HypeWave + 坐标轴 + 邻近里程碑（章节墙 = 步骤 4） */}
        {tab === 'progress' && (
          <>
            <div className="panel">
              <div className="p-head"><span className="k">Hype Wave</span><h2>剧情张力曲线</h2><span className="note">点曲线试跳进度</span></div>
              <p className="p-sub">亮蓝=走过的张力，灰线=前方；实心橙=必看名场面，⚔=Boss 存档点；下方渐变轴：◆=推荐起点，金点=你在这里。</p>
              <V10Wave game={game} value={value} setValue={setValue} guard={guard} openBoss={openBoss} openEntry={openEntry} />
            </div>
            <div className="panel sec-gap">
              <div className="p-head"><span className="k">Chapters</span><h2>章节墙</h2></div>
              <div className="ph"><div className="big">🚧</div><p><b>章节墙施工中</b>（步骤 4：大卡 + ⚔ 存档集成）</p></div>
            </div>
          </>
        )}

        {/* 历程 Tab：蜿蜒旅程图（v10-C + B 里程碑元素） */}
        {tab === 'journey' && (
          <>
            <div className="p-head"><span className="k">Journey</span><h2>成长旅程</h2></div>
            <p className="p-sub">金色是走过的路，虚线是前方。🎁 是推荐起点；各段就近的 ⚔ 存档直接挂在节点卡里。</p>
            {(game.journey && game.journey.length > 0)
              ? <V10Journey game={game} value={value} openBoss={openBoss} openEntry={openEntry} />
              : <div className="panel ph"><p>本作暂无成长历程数据</p></div>}
          </>
        )}

        {/* 舆情 Tab：沿用 v9（铁律 4，只接入口） */}
        {tab === 'senti' && (
          Senti
            ? <div className="v9-senti-host"><Senti game={game} /></div>
            : <div className="panel ph"><p>v9 舆情组件未加载</p></div>
        )}
      </main>

      {/* 真实进度控制（定稿决策：滑杆=真实 value/setValue，全视图联动） */}
      <div className="sim">
        <span className="sl">进度</span>
        <input type="range" min="0" max="100" value={value} onChange={e => setValue(+e.target.value)} />
        <output className="mono">{value}%</output>
      </div>
    </div>
  );
}

Object.assign(window, { V10App, V10Journey, V10Wave });
