/* 多端预览：App / PC 桌面 / 小程序 切换（浏览器 QA 用，复用真实组件 + 真实数据） */
function PreviewPage() {
  const [games, setGames] = useState(null);
  const [plat, setPlat] = useState('app');
  const [theme, setTheme] = useState('light');
  const [gi, setGi] = useState(0);
  const [view, setView] = useState('library');
  const [tab, setTab] = useState('progress');
  const [value, setValue] = useState(0);
  const [stage, setStage] = useState('app');
  useEffect(() => {
    (async () => {
      const raws = await loadRawGames();
      const adapted = raws.map(adaptGame);
      window.YB = {
        games: adapted
      };
      setGames(adapted);
      setValue(adapted[0].currentPct);
    })();
  }, []);
  const enter = (i, keepTab) => {
    setGi(i);
    setValue(games[i].currentPct);
    setView('game');
    if (!keepTab) setTab('progress');
  };
  const tabs = [['app', 'App 手机'], ['pc', 'PC 桌面'], ['mp', '微信小程序']];
  const cap = plat === 'pc' ? '1240 × 800 · Tauri 桌面窗口' : plat === 'mp' ? '402 × 874 · 小程序精简变体' : '402 × 874 · App';
  return /*#__PURE__*/React.createElement("div", {
    className: "pv-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pv-toggle"
  }, tabs.map(([k, n]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: 'pv-btn' + (plat === k ? ' on' : ''),
    onClick: () => setPlat(k)
  }, n)), /*#__PURE__*/React.createElement("span", {
    className: "pv-cap mono"
  }, cap)), /*#__PURE__*/React.createElement("div", {
    className: 'pv-stage pv-' + plat
  }, !games ? /*#__PURE__*/React.createElement("div", {
    className: "boot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "boot-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "boot-spin"
  }), "\u52A0\u8F7D\u4E2D\u2026")) : plat === 'pc' ? /*#__PURE__*/React.createElement(ScaledFrame, {
    designW: 1240,
    designH: 800
  }, /*#__PURE__*/React.createElement(DesktopApp, {
    games: games,
    gi: gi,
    enter: enter,
    value: value,
    setValue: setValue,
    theme: theme,
    setTheme: setTheme,
    onProfile: () => {}
  })) : /*#__PURE__*/React.createElement(YBApp, {
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
    setStage: setStage,
    mp: plat === 'mp'
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(PreviewPage, null));