/* ============================================================
   游伴 YouBan · 应用入口（Electron）
   - 数据源不变：src/data/games/*.json，经 window.gameAPI(IPC) 加载
   - adaptGame：把 src JSON 映射为设计稿组件所需的视图模型
   - 复用 design 的 React 组件（components.jsx / screens.jsx）
   ============================================================ */
/* hooks（useState/useEffect）由 components.js 全局声明，预编译为普通脚本时直接复用 */
/* ───────── 数据源：Tauri(invoke) 优先，回退 Electron(gameAPI) ───────── */
async function loadRawGames() {
  const t = window.__TAURI__;
  const invoke = t && (t.core && t.core.invoke ? t.core.invoke : t.invoke);
  if (invoke) {
    const list = await invoke("get_game_list");
    return Promise.all((list || []).map(g => invoke("get_game_data", {
      id: g.id
    })));
  }
  if (window.gameAPI) {
    const list = await window.gameAPI.getGameList();
    return Promise.all((list || []).map(g => window.gameAPI.getGameData(g.id)));
  }
  if (Array.isArray(window.__YB_RAW__)) {
    return window.__YB_RAW__; // 浏览器预览回退（preview.html 注入）
  }
  throw new Error("无可用数据源（Tauri / gameAPI / __YB_RAW__ 均不可用）");
}

/* ───────── 适配器：src JSON → 视图模型 ───────── */
function adaptGame(g) {
  const t = g.gameTheme || {};
  const ov = g.overview || {};
  const ps = g.playerSentiment || {};
  const kw = ps.keywords || {};
  const sd = g.saveDownload;
  return {
    id: g.id,
    titleMain: g.titleMain || g.name,
    titleSub: g.titleSub || '',
    short: g.short || g.name,
    developer: g.developer,
    year: g.year,
    genre: g.genre || '',
    hoursMain: g.totalHoursMain,
    currentPct: g.currentPct == null ? 0 : g.currentPct,
    poster: g.posterUrl,
    banner: g.bannerUrl,
    theme: {
      bg: t.bg,
      card: t.bgCard || t.card,
      accent: t.accent,
      accent2: t.accent2,
      text: t.text
    },
    tagline: ov.tagline || '',
    desc: ov.description || '',
    highlights: ov.highlights || [],
    chapters: (g.chapters || []).map(c => ({
      name: c.name,
      planet: c.planet,
      start: c.progressStart,
      end: c.progressEnd,
      hype: c.hypeScore,
      key: c.keyEvent,
      plot: c.plotDetail,
      goals: c.playerGoals,
      chars: c.newCharacters
    })),
    bosses: (g.bossSaves || []).map(b => ({
      id: b.id,
      name: b.name,
      nameEn: b.nameEn || '',
      pct: b.progressPct,
      planet: b.planet,
      gap: b.storyGap || 0,
      hi: !!b.highlight,
      plot: (b.context || {}).plot,
      chars: (b.context || {}).characters,
      fight: (b.context || {}).gameplay,
      folder: b.folder
    })),
    hype: (g.hypePeaks || []).map(p => ({
      pct: p.progressPct,
      label: p.label,
      score: p.score,
      color: p.color
    })),
    entries: (g.entryPoints || []).map(e => ({
      pct: e.progressPct,
      label: e.label,
      reason: e.reason
    })),
    journey: (g.protagonistJourney || []).map(j => ({
      pct: j.progressPct,
      event: j.event,
      desc: j.description,
      unlocks: j.unlocks || []
    })),
    sentiment: {
      score: ps.steamScore || 0,
      source: ps.source || '',
      note: ps.note || '',
      praise: kw.praise || [],
      criticism: kw.criticism || [],
      hot: kw.hot || [],
      quotes: (ps.testimonials || []).map(q => ({
        text: q.text,
        author: q.author,
        up: q.upvotes
      }))
    },
    ach: (g.achievements || []).map(a => ({
      id: a.steamId,
      name: a.name,
      pct: a.progressPct
    })),
    achNote: '已读取 Steam 成就，进度已同步至最近解锁节点',
    save: sd ? {
      steps: (sd.instructions || '').split('\n').map(s => s.replace(/^\d+\.\s*/, '')).filter(Boolean),
      path: sd.savePath || '',
      url: sd.url || ''
    } : null
  };
}

/* ───────── 游戏内顶栏 ───────── */
function GameTopBar({
  game,
  onBack,
  onSwitch,
  theme,
  setTheme
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
  }))), /*#__PURE__*/React.createElement(ThemeToggle, {
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
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(GameTopBar, {
    game: game,
    onBack: () => setView('library'),
    onSwitch: () => setSwitcher(true),
    theme: theme,
    setTheme: setTheme
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
  adaptGame,
  loadRawGames,
  YBApp,
  GameTopBar,
  GameSwitchSheet,
  Root
});
if (!window.__YB_NO_AUTOMOUNT__) {
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Root, null));
}