/* ============================================================
   游伴 YouBan · 应用入口（Electron）
   - 数据源不变：src/data/games/*.json，经 window.gameAPI(IPC) 加载
   - adaptGame：把 src JSON 映射为设计稿组件所需的视图模型
   - 复用 design 的 React 组件（components.jsx / screens.jsx）
   ============================================================ */
/* hooks（useState/useEffect）由 components.js 全局声明，预编译为普通脚本时直接复用 */
/* 数据层 adaptGame / loadRawGames 已抽到 renderer/adapt.js（普通脚本，先于 dist/app.js 引入），
   这里直接复用全局 adaptGame / loadRawGames。改游戏 JSON 字段名时去 adapt.js 同步。 */

/* ───────── v10 保险丝：v10 运行时崩溃 → 自动回落 v9，绝不白屏 ───────── */
class V10Boundary extends React.Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e, info) {
    console.error('[v10] 渲染崩溃，已自动回落 v9：', e, info && info.componentStack);
    if (this.props.onCrash) this.props.onCrash();
  }
  render() { return this.state.err ? null : this.props.children; }
}

/* ───────── 游戏内顶栏 ───────── */
function GameTopBar({ game, onBack, onSwitch, theme, setTheme, onV10 }) {
  return (
    <div className="gtopbar">
      <button className="gt-btn" onClick={onBack}><Icon name="back" size={16} />游戏库</button>
      <button className="gt-btn" onClick={onSwitch}><span className="gt-name">{game.short}<Icon name="chevd" size={14} /></span></button>
      {onV10 && <button className="gt-btn" onClick={onV10} title="切到 v10 新版界面">v10</button>}
      <ThemeToggle theme={theme} setTheme={setTheme} game={game} />
    </div>
  );
}

/* ───────── 切换游戏底部面板 ───────── */
function GameSwitchSheet({ games, gi, onPick, onClose }) {
  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="drawer themed show" style={{ maxHeight: '72%' }}>
        <div className="drawer-grip" />
        <div className="drawer-head"><h3 style={{ fontSize: 18 }}>切换游戏</h3></div>
        <div className="gsheet-list">
          {games.map((g, i) => (
            <div key={g.id} className={'gsheet-row' + (i === gi ? ' on' : '')} onClick={() => onPick(i)}>
              <img src={g.poster} alt="" onError={e => e.target.style.opacity = .2} />
              <div style={{ flex: 1 }}><div className="nm">{g.short}</div><div className="mt">{g.currentPct}% · {g.hoursMain}h · {g.titleSub}</div></div>
              {i === gi && <Icon name="check" size={18} style={{ color: 'var(--accent)' }} />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ───────── 应用主体（手机外壳 + 屏幕状态机） ───────── */
function YBApp({ games, gi, view, setView, tab, setTab, value, setValue, theme, setTheme, enter, stage, setStage, mp }) {
  const game = games[gi];
  const [boss, setBoss] = useState(null);
  const [entry, setEntry] = useState(null);
  const [switcher, setSwitcher] = useState(false);
  const [profile, setProfile] = useState(false);
  const [connect, setConnect] = useState(null);
  /* v10 新版 UI 开关（feature/v10-ui）：默认开，可切回 v9；v9 渲染路径原样保留 */
  const [v10on, setV10on] = useState(() => { try { return localStorage.getItem('yb_v10') !== '0'; } catch (e) { return true; } });
  const switchV10 = (on) => { setV10on(on); try { localStorage.setItem('yb_v10', on ? '1' : '0'); } catch (e) { /* noop */ } };
  const th = game.theme;
  const vars = { '--g-bg': th.bg, '--g-card': th.card, '--g-accent': th.accent, '--g-accent2': th.accent2, '--g-text': th.text };
  const brand = stage !== 'app';
  const cls = 'yb-app' + (theme === 'light' && !brand ? ' light' : '') + (mp ? ' mp' : '');

  if (brand) {
    return (
      <div className={cls} style={vars}>
        <div className="yb-island" />
        <StatusBar />
        {stage === 'splash'
          ? <SplashScreen onEnter={() => setStage('login')} />
          : <LoginScreen onLogin={() => setStage('app')} />}
        <div className="yb-home" />
      </div>
    );
  }

  let screen;
  if (tab === 'journey') screen = <JourneyScreen game={game} value={value} setValue={setValue} />;
  else if (tab === 'senti') screen = <SentimentScreen game={game} />;
  else screen = <ProgressScreen game={game} value={value} setValue={setValue} openBoss={setBoss} openEntry={setEntry} />;

  return (
    <div className={cls} style={vars}>
      <div className="yb-island" />
      <StatusBar />
      {view === 'library' ? (
        <div className="yb-viewport">
          <LibraryScreen games={games} gi={gi} enter={enter} onProfile={() => setProfile(true)} />
        </div>
      ) : (v10on && window.V10App) ? (
        <>
          <V10Boundary onCrash={() => switchV10(false)}>
            <V10App game={game} games={games} value={value} setValue={setValue}
              onBack={() => setView('library')} onSwitchToV9={() => switchV10(false)}
              openBoss={setBoss} openEntry={setEntry} />
          </V10Boundary>
          <BossDrawer game={game} boss={boss} onClose={() => setBoss(null)} />
          <EntryDetail game={game} entry={entry} onClose={() => setEntry(null)} onStart={setValue} />
        </>
      ) : (
        <>
          <GameTopBar game={game} onBack={() => setView('library')} onSwitch={() => setSwitcher(true)} theme={theme} setTheme={setTheme} onV10={() => switchV10(true)} />
          <div className="yb-viewport">
            {screen}
            <TabBar tab={tab} setTab={setTab} />
          </div>
          <BossDrawer game={game} boss={boss} onClose={() => setBoss(null)} />
          <EntryDetail game={game} entry={entry} onClose={() => setEntry(null)} onStart={setValue} />
          {switcher && <GameSwitchSheet games={games} gi={gi} onPick={(i) => { enter(i, true); setSwitcher(false); }} onClose={() => setSwitcher(false)} />}
        </>
      )}
      {profile && <div className="profile-overlay"><MeScreen games={games} onClose={() => setProfile(false)} theme={theme} setTheme={setTheme} game={game} onConnect={(p) => setConnect(p)} /></div>}
      {connect && <PlatformConnect platform={connect} onClose={() => setConnect(null)} onDone={() => setConnect(null)} />}
      <div className="yb-home" />
    </div>
  );
}

/* ───────── 根：加载数据 → 渲染 ───────── */
function Root() {
  const [games, setGames] = useState(null);
  const [err, setErr] = useState(null);
  const [gi, setGi] = useState(0);
  const [view, setView] = useState('library');
  const [tab, setTab] = useState('progress');
  const [value, setValue] = useState(0);
  const [theme, setTheme] = useState('light');
  const [stage, setStage] = useState('splash');

  useEffect(() => {
    (async () => {
      try {
        const raws = await loadRawGames();
        if (!raws || !raws.length) throw new Error('未发现任何游戏数据 (src/data/games/*.json)');
        const adapted = raws.map(adaptGame);
        window.YB = { games: adapted };
        setGames(adapted);
        setValue(adapted[0].currentPct);
      } catch (e) {
        setErr((e && e.message) ? e.message : String(e));
      }
    })();
  }, []);

  if (err) return <div className="boot"><div className="boot-card"><b>数据加载失败</b><span>{err}</span></div></div>;
  if (!games) return <div className="boot"><div className="boot-card"><span className="boot-spin" />加载中…</div></div>;

  const enter = (i, keepTab) => { setGi(i); setValue(games[i].currentPct); setView('game'); if (!keepTab) setTab('progress'); };

  return (
    <YBApp
      games={games} gi={gi} view={view} setView={setView} tab={tab} setTab={setTab}
      value={value} setValue={setValue} theme={theme} setTheme={setTheme}
      enter={enter} stage={stage} setStage={setStage}
    />
  );
}

Object.assign(window, { YBApp, GameTopBar, GameSwitchSheet, Root });
if (!window.__YB_NO_AUTOMOUNT__) {
  ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
}
