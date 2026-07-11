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
        {/* 进度 Tab（步骤 3-4：HypeWave + 坐标轴 + 邻近里程碑 + 章节墙） */}
        {tab === 'progress' && (
          <div className="panel">
            <div className="p-head"><span className="k">Hype Wave</span><h2>剧情张力曲线</h2></div>
            <div className="ph"><div className="big">🚧</div><p><b>进度 Tab 施工中</b>（步骤 3-4：波形 / 坐标轴 / 邻近里程碑 / 章节墙）</p>
              <p style={{ marginTop: 6, fontSize: 12 }}>右下角滑杆已接真实进度，Hero 统计全联动。</p></div>
          </div>
        )}

        {/* 历程 Tab（步骤 2：蜿蜒旅程图） */}
        {tab === 'journey' && (
          <div className="panel">
            <div className="p-head"><span className="k">Journey</span><h2>成长旅程</h2></div>
            <div className="ph"><div className="big">🚧</div><p><b>历程 Tab 施工中</b>（步骤 2：蜿蜒旅程图）</p></div>
          </div>
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

Object.assign(window, { V10App });
