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
function V10App({
  game,
  games,
  value,
  setValue,
  onBack,
  onSwitchToV9,
  openBoss,
  openEntry
}) {
  const [tab, setTab] = useState('progress');
  const [guard, setGuard] = useState(true); // 防剧透默认开（原型默认 body.guard）
  const [dark, setDark] = useState(false); // 浅色暖调默认
  const [solid, setSolid] = useState(false); // 顶栏滚动加底
  const rootRef = useRef(null);
  const onScroll = () => {
    const el = rootRef.current;
    if (!el) return;
    setSolid(el.scrollTop > el.clientHeight * 0.3);
  };
  const played = value / 100 * game.hoursMain;
  const bossPassed = game.bosses.filter(b => b.pct <= value).length;
  const Senti = window.SentimentScreen;
  return /*#__PURE__*/React.createElement("div", {
    ref: rootRef,
    className: 'v10' + (dark ? ' dark' : '') + (guard ? ' guard' : ''),
    onScroll: onScroll
  }, /*#__PURE__*/React.createElement("nav", {
    className: 'topbar' + (solid ? ' solid' : '')
  }, /*#__PURE__*/React.createElement("button", {
    className: "t-back",
    onClick: onBack
  }, "\u2190"), /*#__PURE__*/React.createElement("div", {
    className: "t-brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/youban-mark.svg",
    alt: "\u6E38\u4F34"
  }), /*#__PURE__*/React.createElement("b", null, game.short)), /*#__PURE__*/React.createElement("div", {
    className: "t-tabs"
  }, [['progress', '进度'], ['journey', '历程'], ['senti', '舆情']].map(([k, n]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: 't-tab' + (tab === k ? ' on' : ''),
    onClick: () => setTab(k)
  }, n))), /*#__PURE__*/React.createElement("button", {
    className: "t-ctl guard-t",
    title: guard ? '防剧透：开' : '防剧透：关',
    onClick: () => setGuard(g => !g)
  }, "\uD83D\uDEE1", /*#__PURE__*/React.createElement("span", {
    className: "sw"
  })), /*#__PURE__*/React.createElement("button", {
    className: "t-ctl",
    title: "\u6D45\u8272 / \u6E38\u620F\u4E3B\u9898\u8272",
    onClick: () => setDark(d => !d)
  }, dark ? '☀' : '🌙'), /*#__PURE__*/React.createElement("button", {
    className: "t-ctl",
    title: "\u5207\u56DE\u65E7\u7248\u754C\u9762",
    onClick: onSwitchToV9
  }, "v9")), /*#__PURE__*/React.createElement("header", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("img", {
    className: "bg",
    src: game.banner,
    alt: "",
    onError: e => {
      e.target.style.display = 'none';
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "greet"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\u6B22\u8FCE\u56DE\u6765 \xB7 \u7EE7\u7EED\u966A ", /*#__PURE__*/React.createElement("b", null, game.short), " \u8D70\u8FD9\u6BB5\u8DEF"), /*#__PURE__*/React.createElement("h1", null, game.titleMain), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, game.titleSub), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, game.developer && /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, game.developer, game.year ? ' · ' + game.year : ''), game.genre && /*#__PURE__*/React.createElement("span", {
    className: "chip"
  }, game.genre), game.tagline && /*#__PURE__*/React.createElement("span", {
    className: "chip gold"
  }, "\u26A1 ", game.tagline)), /*#__PURE__*/React.createElement("div", {
    className: "hero-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "cta primary",
    onClick: () => setTab('progress')
  }, '▶ 继续旅程'), /*#__PURE__*/React.createElement("div", {
    className: "hero-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, value, /*#__PURE__*/React.createElement("small", null, "%")), /*#__PURE__*/React.createElement("span", null, "\u5B8C\u6210\u5EA6")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, played.toFixed(1), /*#__PURE__*/React.createElement("small", null, "h")), /*#__PURE__*/React.createElement("span", null, "\u5DF2\u966A\u8DD1")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, Math.max(0, game.hoursMain - played).toFixed(1), /*#__PURE__*/React.createElement("small", null, "h")), /*#__PURE__*/React.createElement("span", null, "\u5269\u4F59(\u4E3B\u7EBF)")), /*#__PURE__*/React.createElement("div", {
    className: "hstat"
  }, /*#__PURE__*/React.createElement("b", null, bossPassed, /*#__PURE__*/React.createElement("small", null, "/", game.bosses.length)), /*#__PURE__*/React.createElement("span", null, "Boss \u5DF2\u8FC7")))))), /*#__PURE__*/React.createElement("main", null, tab === 'progress' && /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Hype Wave"), /*#__PURE__*/React.createElement("h2", null, "\u5267\u60C5\u5F20\u529B\u66F2\u7EBF")), /*#__PURE__*/React.createElement("div", {
    className: "ph"
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, "\uD83D\uDEA7"), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "\u8FDB\u5EA6 Tab \u65BD\u5DE5\u4E2D"), "\uFF08\u6B65\u9AA4 3-4\uFF1A\u6CE2\u5F62 / \u5750\u6807\u8F74 / \u90BB\u8FD1\u91CC\u7A0B\u7891 / \u7AE0\u8282\u5899\uFF09"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 6,
      fontSize: 12
    }
  }, "\u53F3\u4E0B\u89D2\u6ED1\u6746\u5DF2\u63A5\u771F\u5B9E\u8FDB\u5EA6\uFF0CHero \u7EDF\u8BA1\u5168\u8054\u52A8\u3002"))), tab === 'journey' && /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Journey"), /*#__PURE__*/React.createElement("h2", null, "\u6210\u957F\u65C5\u7A0B")), /*#__PURE__*/React.createElement("div", {
    className: "ph"
  }, /*#__PURE__*/React.createElement("div", {
    className: "big"
  }, "\uD83D\uDEA7"), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "\u5386\u7A0B Tab \u65BD\u5DE5\u4E2D"), "\uFF08\u6B65\u9AA4 2\uFF1A\u873F\u8712\u65C5\u7A0B\u56FE\uFF09"))), tab === 'senti' && (Senti ? /*#__PURE__*/React.createElement("div", {
    className: "v9-senti-host"
  }, /*#__PURE__*/React.createElement(Senti, {
    game: game
  })) : /*#__PURE__*/React.createElement("div", {
    className: "panel ph"
  }, /*#__PURE__*/React.createElement("p", null, "v9 \u8206\u60C5\u7EC4\u4EF6\u672A\u52A0\u8F7D")))), /*#__PURE__*/React.createElement("div", {
    className: "sim"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sl"
  }, "\u8FDB\u5EA6"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: value,
    onChange: e => setValue(+e.target.value)
  }), /*#__PURE__*/React.createElement("output", {
    className: "mono"
  }, value, "%")));
}
Object.assign(window, {
  V10App
});