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

/* ───────── 进度 Tab：V10Hype —— v9 HypeProgress 复刻版（v9 原件不动）
   与 v9 的差异仅三处（王彪 2026-07 反馈）：
   ① 静止/拖动都只显示当前前后各 1 个节点（v9 是静止 6 个/拖动 ±3）
   ② Boss 节点内嵌 ⚔ 字形
   ③ 图例只留 Boss战 + 推荐起点，字号缩小 ───────── */
function V10Hype({ game, value, onChange, onBoss, onEntry, idBase, guard }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [tapped, setTapped] = useState(null);
  const gid = idBase || ('v10-' + game.id);
  const pk = game.hype;
  const nodes = React.useMemo(() => buildNodes(game), [game.id]);
  const entries = (game.entries || []).filter(e => e.pct > 0);

  /* 波形：与 v9 完全一致 */
  const Y = (s) => 100 - (Math.max(0, Math.min(10, s)) / 10) * 86 - 7;
  const cps = [{ x: 0, s: 1.1 }];
  pk.forEach((p, i) => {
    if (i > 0) {
      const pr = pk[i - 1];
      const valley = Math.max(0.8, Math.min(pr.score, p.score) - 3.6 - (i % 2) * 0.8);
      cps.push({ x: (pr.pct + p.pct) / 2, s: valley });
    }
    cps.push({ x: p.pct, s: p.score });
  });
  cps.push({ x: 100, s: 1.1 });
  const wpts = cps.map(c => ({ x: c.x, y: Y(c.s) }));
  const line = smoothPath(wpts);
  const area = line + ' L 100 100 L 0 100 Z';

  const setFromX = useCallback((clientX) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    let pct = ((clientX - r.left) / r.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    for (const p of pk) if (Math.abs(p.pct - pct) < 1.6) pct = p.pct;
    onChange(Math.round(pct));
  }, [pk, onChange]);

  useEffect(() => {
    if (!drag) return;
    const mv = (e) => { e.preventDefault(); setFromX(e.touches ? e.touches[0].clientX : e.clientX); };
    const up = () => setDrag(false);
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  }, [drag, setFromX]);

  /* 差异①：可见节点 = 当前前后各 1 个 */
  const before = nodes.filter(n => n.pct <= value).slice(-1);
  const after = nodes.filter(n => n.pct > value).slice(0, 1);
  const visKeys = new Set([...before, ...after].map(n => n.pct + n.type));

  const tapNode = (n, e) => {
    e.stopPropagation();
    /* 防剧透：未到的 Boss 不直接开抽屉（会剧透），改弹匿名气泡 */
    if (n.type === 'boss' && !(guard && n.pct > value)) { onBoss && onBoss(n.boss); }
    else { setTapped(t => (t && t.pct === n.pct) ? null : n); }
  };
  const capLabel = (n) => (guard && n.pct > value) ? '？？？（防剧透）' : n.label;

  return (
    <div>
      <div className="hype" ref={ref} onPointerDown={(e) => { setTapped(null); setDrag(true); setFromX(e.clientX); }}>
        <svg className="wave" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={'wg-' + gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--g-accent)" stopOpacity=".5" />
              <stop offset="58%" stopColor="var(--g-accent)" stopOpacity=".14" />
              <stop offset="100%" stopColor="var(--g-accent)" stopOpacity=".02" />
            </linearGradient>
            <clipPath id={'wc-' + gid}><rect x="0" y="0" width={value} height="100" /></clipPath>
          </defs>
          <path d={area} fill={'url(#wg-' + gid + ')'} opacity=".34" />
          <path d={area} fill={'url(#wg-' + gid + ')'} clipPath={'url(#wc-' + gid + ')'} />
          <path d={line} fill="none" stroke="var(--g-accent)" strokeWidth=".8" strokeOpacity=".3" vectorEffect="non-scaling-stroke" />
          <path d={line} fill="none" stroke="var(--g-accent)" strokeWidth="1.6" clipPath={'url(#wc-' + gid + ')'} vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="baseline" />
        <div className="fill" style={{ width: value + '%' }} />
        {game.chapters.slice(0, -1).map((c, i) => <div key={i} className="tick" style={{ left: c.end + '%' }} />)}

        {entries.map((e, i) => (
          <div key={'e' + i} className="enode" style={{ left: e.pct + '%' }}
            onPointerDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); onEntry && onEntry(e); }}>
            <Icon name="star" size={12} />
          </div>
        ))}

        {nodes.map((n, i) => (
          <div key={i}
            className={'node n-' + NODE_TYPES[n.type].cls + (n.pct < value ? ' passed' : ' upcoming') + (visKeys.has(n.pct + n.type) ? '' : ' hidden') + (tapped && tapped.pct === n.pct ? ' on' : '')}
            style={{ left: n.pct + '%' }}
            onPointerDown={(e) => e.stopPropagation()} onClick={(e) => tapNode(n, e)}>
            {n.type === 'boss' && <span className="nsw">{'⚔︎'}</span>}
          </div>
        ))}

        {tapped && (
          <div className={'node-cap n-' + NODE_TYPES[tapped.type].cls} style={{ left: Math.min(80, Math.max(16, tapped.pct)) + '%' }}>
            <i className="nc-ic"><Icon name={NODE_TYPES[tapped.type].icon} size={11} /></i>
            <span><b>{nodeLabel(tapped.type, game)}</b>{capLabel(tapped)}</span>
          </div>
        )}

        <div className="thumb" style={{ left: value + '%' }} onPointerDown={(e) => { e.stopPropagation(); setTapped(null); setDrag(true); }} />
        <div className="thumb-flag" style={{ left: value + '%' }}>{value}%</div>
      </div>

      <div className="hype-ends"><span>开场</span><span></span><span>终章</span></div>

      {/* 差异③：图例只留两项；该作无 Boss 类节点时不显示那一项 */}
      <div className="node-legend">
        {!!(game.bosses && game.bosses.length) &&
          <span className="leg n-boss"><i className="leg-dot">{'⚔︎'}</i>{nodeLabel('boss', game)}</span>}
        <span className="leg n-entry"><i className="leg-dot leg-star"><Icon name="star" size={9} /></i>推荐起点</span>
      </div>
    </div>
  );
}

/* ───────── 进度 Tab：V10Axis —— v10 动态渐变坐标轴（拖动显示当前章节/位置） ───────── */
function V10Axis({ game, value, setValue, openEntry }) {
  const barRef = useRef(null);
  const chapters = game.chapters;
  const entries = game.entries || [];
  const curCh = chapters.find(c => value >= c.start && value < c.end) || chapters[chapters.length - 1];
  const shortName = (c) => c.name.split(/[：:]/)[0];
  return (
    <div className="axis">
      <div ref={barRef} className="bar" onClick={(e) => {
        if (e.target !== barRef.current && !e.target.classList.contains('fill') && !e.target.classList.contains('fillclip')) return;
        const r = barRef.current.getBoundingClientRect();
        setValue(Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100))));
      }}>
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
  );
}

/* ───────── 进度 Tab：高潮节点前后小卡（v9 HypeProgress 的 v10 补充件） ───────── */
function V10PrevNext({ game, value }) {
  /* 事件源 = ⚔Boss + 🔥名场面（score>=8），只取当前前后各一个 */
  const evs = React.useMemo(() => [
    ...(game.bosses || []).map(b => ({ pct: b.pct, n: b.name, t: game.bossTerm || 'Boss 战', ic: '⚔' })),
    ...(game.hype || []).filter(p => p.score >= 8).map(p => ({ pct: p.pct, n: p.label, t: '名场面', ic: '🔥' })),
  ].sort((a, b) => a.pct - b.pct), [game.id]);
  const prev = [...evs].reverse().find(e => e.pct <= value);
  const next = evs.find(e => e.pct > value);
  if (!prev && !next) return null;
  return (
    <div className="nearby">
      {prev && (
        <div className="nb prev"><div className="ic">{prev.ic}</div>
          <div className="tt"><div className="tl">刚走过</div>
            <div className="nm">{prev.n}</div>
            <div className="mt2">{prev.t} · {prev.pct}%</div></div>
        </div>
      )}
      {next && (
        <div className="nb next"><div className="ic">{next.ic}</div>
          <div className="tt"><div className="tl">即将抵达</div>
            <div className="nm spoil">{next.n}</div>
            <div className="mt2">{next.t} · {next.pct}% · 约 {((next.pct - value) / 100 * game.hoursMain).toFixed(1)}h 后</div></div>
        </div>
      )}
    </div>
  );
}

/* ───────── 进度 Tab：章节墙（步骤 4，v10-C 大卡 + ⚔ 存档集成，不做独立 Boss 列表） ───────── */
function V10Chapters({ game, value, openBoss }) {
  /* 无每章配图 → 用 banner 按章节序号取不同焦点位，营造差异 */
  const posFor = (i) => `${(i * 37) % 70 + 15}% ${(i * 29) % 50 + 20}%`;
  const [peeked, setPeeked] = useState({});
  return (
    <div className="ch-grid">
      {game.chapters.map((c, i) => {
        const saves = (game.bosses || []).filter(b => b.pct >= c.start && b.pct < c.end);
        const state = value >= c.end ? 'done' : value >= c.start ? 'current' : 'future';
        const fillW = state === 'done' ? 100 : state === 'current' ? Math.round((value - c.start) / Math.max(1, c.end - c.start) * 100) : 0;
        return (
          <div key={i} className={'ch-card ' + state + (peeked[i] ? ' peeked' : '')}>
            {state === 'future' && <span className="peek" onClick={() => setPeeked(p => ({ ...p, [i]: !p[i] }))}>偷看一眼 👀</span>}
            <div className="ch-thumb">
              <img src={game.banner} style={{ objectPosition: posFor(i) }} alt="" onError={e => { e.target.style.display = 'none'; }} />
              <div className="tint" />
              <span className="ch-badge">{state === 'done' ? '✓ 已走过' : state === 'current' ? '⟡ 你在这里' : '🔒 未抵达'}</span>
              <span className="planet">🪐 {c.planet}</span>
              <span className="range mono">{c.start}–{c.end}%</span>
            </div>
            <div className="ch-body">
              <h3>{c.name}</h3>
              <div className="ch-key">{c.key}</div>
              <div className="ch-foot">
                {c.hype ? <span className="hype-n">🔥 热度 {c.hype}</span> : null}
                <div className="ch-fill"><i style={{ width: fillW + '%' }} /></div>
              </div>
              {saves.length > 0 && (
                <div className="ch-saves">
                  {saves.map(b => {
                    const locked = b.pct > value;
                    return (
                      <div key={b.id || b.pct} className={'sv' + (b.hi ? ' hi' : '') + (locked ? ' locked' : '')}>
                        <span className="swd">⚔</span>
                        <span className="n" onClick={() => { if (!locked && openBoss) openBoss(b); }}>{b.name}</span>
                        {b.hi ? <span className="hib">名场面</span> : null}
                        <span className="pc2 mono">{b.pct}%</span>
                        <button className="dl" onClick={() => openBoss && openBoss(b)}>{'⤓ 存档'}</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── 全局态：防剧透 / 主题（步骤 6 会统一各模块模糊规则） ───────── */
function V10App({ game, games, value, setValue, onBack, onSwitchToV9, openBoss, openEntry, theme, setTheme }) {
  const [tab, setTab] = useState('progress');
  const [guard, setGuard] = useState(true);     // 防剧透默认开（原型默认 body.guard）
  const [solid, setSolid] = useState(false);    // 顶栏滚动加底
  const [greet, setGreet] = useState(true);     // 进入游戏后的打招呼 toast（自动消失）
  const rootRef = useRef(null);
  /* 深色 = v9 的「游戏主题色」机制（同一状态，切 v9/v10 保持一致） */
  const dark = theme === 'game';
  const toggleTheme = () => setTheme && setTheme(dark ? 'light' : 'game');

  useEffect(() => {
    setGreet(true);
    const t = setTimeout(() => setGreet(false), 3900);
    return () => clearTimeout(t);
  }, [game.id]);

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
        <button className="t-ctl" title={dark ? '切浅色' : '切游戏主题色'} onClick={toggleTheme}>{dark ? '☀' : '🌙'}</button>
        <button className="t-ctl" title="切回旧版界面" onClick={onSwitchToV9}>v9</button>
      </nav>

      {greet && <div className="greet-toast" key={game.id}><span className="dot" />欢迎回来 · 继续陪 <b>{game.short}</b> 走这段路</div>}

      {/* Hero：v9 banner 基底 + 打招呼 + 数据面板（信息精简，标签挪简介） */}
      <header className="hero">
        <img className="bg" src={game.banner} alt="" onError={e => { e.target.style.display = 'none'; }} />
        <div className="scrim" />
        <div className="inner">
          <h1>{game.titleMain}</h1>
          <div className="sub">{game.titleSub}</div>
          <div className="hero-stats">
            <div className="hstat"><b>{value}<small>%</small></b><span>完成度</span></div>
            <div className="hstat"><b>{played.toFixed(1)}<small>h</small></b><span>已陪跑</span></div>
            <div className="hstat"><b>{Math.max(0, game.hoursMain - played).toFixed(1)}<small>h</small></b><span>剩余(主线)</span></div>
            {/* 统计口径用短名（"Boss 战"→"Boss"、"关键抉择"不变），避免"Boss 战 已过"这种啰嗦 */}
            <div className="hstat"><b>{bossPassed}<small>/{game.bosses.length}</small></b><span>{(game.bossTerm || 'Boss').replace(/战$/, '').trim()} 已过</span></div>
          </div>
        </div>
      </header>

      <main>
        {/* 进度 Tab：进度输入(v9) → 游戏简介(v9+chips) → HypeWave(v9组件) + 前后小卡 → 章节墙(步骤4) */}
        {tab === 'progress' && (
          <>
            <ProgressInput game={game} value={value} setValue={setValue} />
            <div className="panel sec-gap">
              <div className="p-head"><span className="k">About</span><h2>游戏简介</h2></div>
              <div className="v10-chiprow">
                {game.developer ? <span className="vchip">{game.developer}{game.year ? ' · ' + game.year : ''}</span> : null}
                {game.genre ? <span className="vchip">{game.genre}</span> : null}
                {game.hoursMain > 0 ? <span className="vchip">主线约 {game.hoursMain}h</span> : null}
              </div>
              <Overview game={game} />
            </div>
            <div className="panel sec-gap">
              <div className="p-head"><span className="k">Progress</span><h2>流程进度</h2><span className="note">拖动预览</span></div>
              <V10Hype game={game} value={value} onChange={setValue} onBoss={openBoss} onEntry={openEntry} idBase={'v10-' + game.id} guard={guard} />
              <V10Axis game={game} value={value} setValue={setValue} openEntry={openEntry} />
              <V10PrevNext game={game} value={value} />
            </div>
            <div className="panel sec-gap">
              <div className="p-head"><span className="k">Chapters</span><h2>章节墙</h2>
                {!!(game.bosses && game.bosses.length) && <span className="note">⚔ 存档在各章卡内</span>}</div>
              <V10Chapters game={game} value={value} openBoss={openBoss} />
            </div>
          </>
        )}

        {/* 历程 Tab：蜿蜒旅程图（v10-C + B 里程碑元素） */}
        {tab === 'journey' && (
          <>
            <div className="p-head"><span className="k">Journey</span><h2>成长旅程</h2></div>
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

Object.assign(window, { V10App, V10Journey, V10Hype, V10Axis, V10PrevNext, V10Chapters });
