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

/* ───────── 进度 Tab：高潮节点前后小卡（v9 HypeProgress 的 v10 补充件） ───────── */
function V10PrevNext({ game, value }) {
  /* 事件源 = ⚔Boss + 🔥名场面（score>=8），只取当前前后各一个 */
  const evs = React.useMemo(() => [
    ...(game.bosses || []).map(b => ({ pct: b.pct, n: b.name, t: 'Boss 战', ic: '⚔' })),
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

      {/* Hero：v9 banner 基底 + 打招呼 + 数据面板（信息精简，标签挪简介） */}
      <header className="hero">
        <img className="bg" src={game.banner} alt="" onError={e => { e.target.style.display = 'none'; }} />
        <div className="scrim" />
        <div className="inner">
          <div className="greet"><span className="dot" />欢迎回来 · 继续陪 <b>{game.short}</b> 走这段路</div>
          <h1>{game.titleMain}</h1>
          <div className="sub">{game.titleSub}</div>
          <div className="hero-stats">
            <div className="hstat"><b>{value}<small>%</small></b><span>完成度</span></div>
            <div className="hstat"><b>{played.toFixed(1)}<small>h</small></b><span>已陪跑</span></div>
            <div className="hstat"><b>{Math.max(0, game.hoursMain - played).toFixed(1)}<small>h</small></b><span>剩余(主线)</span></div>
            <div className="hstat"><b>{bossPassed}<small>/{game.bosses.length}</small></b><span>Boss 已过</span></div>
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
              <div className="p-head"><span className="k">Hype Wave</span><h2>剧情张力曲线</h2><span className="note">拖动预览</span></div>
              <HypeProgress game={game} value={value} onChange={setValue} onBoss={openBoss} onEntry={openEntry} idBase={'v10-' + game.id} />
              <V10PrevNext game={game} value={value} />
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

Object.assign(window, { V10App, V10Journey, V10PrevNext });
