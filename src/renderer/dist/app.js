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
  constructor(props) {
    super(props);
    this.state = {
      err: false
    };
  }
  static getDerivedStateFromError() {
    return {
      err: true
    };
  }
  componentDidCatch(e, info) {
    console.error('[v10] 渲染崩溃，已自动回落 v9：', e, info && info.componentStack);
    if (this.props.onCrash) this.props.onCrash();
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

/* ───────── 游戏内顶栏 ───────── */
function GameTopBar({
  game,
  onBack,
  onSwitch,
  theme,
  setTheme,
  onV10
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "gtopbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "gt-btn",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "back",
    size: 16
  }), "\u6E38\u620F\u5E93"), /*#__PURE__*/React.createElement("button", {
    className: "gt-btn",
    onClick: onSwitch
  }, /*#__PURE__*/React.createElement("span", {
    className: "gt-name"
  }, game.short, /*#__PURE__*/React.createElement(Icon, {
    name: "chevd",
    size: 14
  }))), onV10 && /*#__PURE__*/React.createElement("button", {
    className: "gt-btn",
    onClick: onV10,
    title: "\u5207\u5230 v10 \u65B0\u7248\u754C\u9762"
  }, "v10"), /*#__PURE__*/React.createElement(ThemeToggle, {
    theme: theme,
    setTheme: setTheme,
    game: game
  }));
}

/* ───────── 切换游戏底部面板 ───────── */
function GameSwitchSheet({
  games,
  gi,
  onPick,
  onClose
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "scrim show",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "drawer themed show",
    style: {
      maxHeight: '72%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "drawer-grip"
  }), /*#__PURE__*/React.createElement("div", {
    className: "drawer-head"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 18
    }
  }, "\u5207\u6362\u6E38\u620F")), /*#__PURE__*/React.createElement("div", {
    className: "gsheet-list"
  }, games.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: g.id,
    className: 'gsheet-row' + (i === gi ? ' on' : ''),
    onClick: () => onPick(i)
  }, /*#__PURE__*/React.createElement("img", {
    src: g.poster,
    alt: "",
    onError: e => e.target.style.opacity = .2
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, g.short), /*#__PURE__*/React.createElement("div", {
    className: "mt"
  }, g.currentPct, "% \xB7 ", g.hoursMain, "h \xB7 ", g.titleSub)), i === gi && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    style: {
      color: 'var(--accent)'
    }
  }))))));
}

/* ───────── 应用主体（手机外壳 + 屏幕状态机） ───────── */
function YBApp({
  games,
  gi,
  view,
  setView,
  tab,
  setTab,
  value,
  setValue,
  theme,
  setTheme,
  enter,
  stage,
  setStage,
  mp
}) {
  const game = games[gi];
  const [boss, setBoss] = useState(null);
  const [entry, setEntry] = useState(null);
  const [switcher, setSwitcher] = useState(false);
  const [profile, setProfile] = useState(false);
  const [connect, setConnect] = useState(null);
  /* v10 新版 UI 开关（feature/v10-ui）：默认开，可切回 v9；v9 渲染路径原样保留 */
  const [v10on, setV10on] = useState(() => {
    try {
      return localStorage.getItem('yb_v10') !== '0';
    } catch (e) {
      return true;
    }
  });
  const switchV10 = on => {
    setV10on(on);
    try {
      localStorage.setItem('yb_v10', on ? '1' : '0');
    } catch (e) {/* noop */}
  };
  const th = game.theme;
  const vars = {
    '--g-bg': th.bg,
    '--g-card': th.card,
    '--g-accent': th.accent,
    '--g-accent2': th.accent2,
    '--g-text': th.text
  };
  const brand = stage !== 'app';
  const cls = 'yb-app' + (theme === 'light' && !brand ? ' light' : '') + (mp ? ' mp' : '');
  if (brand) {
    return /*#__PURE__*/React.createElement("div", {
      className: cls,
      style: vars
    }, /*#__PURE__*/React.createElement("div", {
      className: "yb-island"
    }), /*#__PURE__*/React.createElement(StatusBar, null), stage === 'splash' ? /*#__PURE__*/React.createElement(SplashScreen, {
      onEnter: () => setStage('login')
    }) : /*#__PURE__*/React.createElement(LoginScreen, {
      onLogin: () => setStage('app')
    }), /*#__PURE__*/React.createElement("div", {
      className: "yb-home"
    }));
  }
  let screen;
  if (tab === 'journey') screen = /*#__PURE__*/React.createElement(JourneyScreen, {
    game: game,
    value: value,
    setValue: setValue
  });else if (tab === 'senti') screen = /*#__PURE__*/React.createElement(SentimentScreen, {
    game: game
  });else screen = /*#__PURE__*/React.createElement(ProgressScreen, {
    game: game,
    value: value,
    setValue: setValue,
    openBoss: setBoss,
    openEntry: setEntry
  });
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    style: vars
  }, /*#__PURE__*/React.createElement("div", {
    className: "yb-island"
  }), /*#__PURE__*/React.createElement(StatusBar, null), view === 'library' ? /*#__PURE__*/React.createElement("div", {
    className: "yb-viewport"
  }, /*#__PURE__*/React.createElement(LibraryScreen, {
    games: games,
    gi: gi,
    enter: enter,
    onProfile: () => setProfile(true)
  })) : v10on && window.V10App ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(V10Boundary, {
    onCrash: () => switchV10(false)
  }, /*#__PURE__*/React.createElement(V10App, {
    game: game,
    games: games,
    value: value,
    setValue: setValue,
    onBack: () => setView('library'),
    onSwitchToV9: () => switchV10(false),
    openBoss: setBoss,
    openEntry: setEntry
  })), /*#__PURE__*/React.createElement(BossDrawer, {
    game: game,
    boss: boss,
    onClose: () => setBoss(null)
  }), /*#__PURE__*/React.createElement(EntryDetail, {
    game: game,
    entry: entry,
    onClose: () => setEntry(null),
    onStart: setValue
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GameTopBar, {
    game: game,
    onBack: () => setView('library'),
    onSwitch: () => setSwitcher(true),
    theme: theme,
    setTheme: setTheme,
    onV10: () => switchV10(true)
  }), /*#__PURE__*/React.createElement("div", {
    className: "yb-viewport"
  }, screen, /*#__PURE__*/React.createElement(TabBar, {
    tab: tab,
    setTab: setTab
  })), /*#__PURE__*/React.createElement(BossDrawer, {
    game: game,
    boss: boss,
    onClose: () => setBoss(null)
  }), /*#__PURE__*/React.createElement(EntryDetail, {
    game: game,
    entry: entry,
    onClose: () => setEntry(null),
    onStart: setValue
  }), switcher && /*#__PURE__*/React.createElement(GameSwitchSheet, {
    games: games,
    gi: gi,
    onPick: i => {
      enter(i, true);
      setSwitcher(false);
    },
    onClose: () => setSwitcher(false)
  })), profile && /*#__PURE__*/React.createElement("div", {
    className: "profile-overlay"
  }, /*#__PURE__*/React.createElement(MeScreen, {
    games: games,
    onClose: () => setProfile(false),
    theme: theme,
    setTheme: setTheme,
    game: game,
    onConnect: p => setConnect(p)
  })), connect && /*#__PURE__*/React.createElement(PlatformConnect, {
    platform: connect,
    onClose: () => setConnect(null),
    onDone: () => setConnect(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "yb-home"
  }));
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
        window.YB = {
          games: adapted
        };
        setGames(adapted);
        setValue(adapted[0].currentPct);
      } catch (e) {
        setErr(e && e.message ? e.message : String(e));
      }
    })();
  }, []);
  if (err) return /*#__PURE__*/React.createElement("div", {
    className: "boot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "boot-card"
  }, /*#__PURE__*/React.createElement("b", null, "\u6570\u636E\u52A0\u8F7D\u5931\u8D25"), /*#__PURE__*/React.createElement("span", null, err)));
  if (!games) return /*#__PURE__*/React.createElement("div", {
    className: "boot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "boot-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "boot-spin"
  }), "\u52A0\u8F7D\u4E2D\u2026"));
  const enter = (i, keepTab) => {
    setGi(i);
    setValue(games[i].currentPct);
    setView('game');
    if (!keepTab) setTab('progress');
  };
  return /*#__PURE__*/React.createElement(YBApp, {
    games: games,
    gi: gi,
    view: view,
    setView: setView,
    tab: tab,
    setTab: setTab,
    value: value,
    setValue: setValue,
    theme: theme,
    setTheme: setTheme,
    enter: enter,
    stage: stage,
    setStage: setStage
  });
}
Object.assign(window, {
  YBApp,
  GameTopBar,
  GameSwitchSheet,
  Root
});
if (!window.__YB_NO_AUTOMOUNT__) {
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Root, null));
}