/* ============================================================
   游伴 YouBan · PC 桌面端（Tauri 窗口）
   复用移动端组件：HypeProgress / ScoreRing / ProgressInput / Overview / CharCard
   右侧采用「主从」布局：默认舆情/历程，点击节点切到详情
   ============================================================ */
const {
  useState: useStateD,
  useRef: useRefD,
  useEffect: useEffectD
} = React;

/* 自适应缩放：固定设计尺寸按容器宽度等比缩放 */
function ScaledFrame({
  designW,
  designH,
  children
}) {
  const ref = useRefD(null);
  const [scale, setScale] = useStateD(1);
  useEffectD(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / designW));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [designW]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: designW * scale,
      height: designH * scale,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: designW,
      height: designH,
      transform: `scale(${scale})`,
      transformOrigin: 'top left'
    }
  }, children)));
}
function WinBtn({
  kind
}) {
  const ic = {
    min: 'M5 12h14',
    max: 'M6 6h12v12H6z',
    close: 'M6 6l12 12M18 6L6 18'
  }[kind];
  return /*#__PURE__*/React.createElement("button", {
    className: 'desk-winbtn ' + kind
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: ic,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })));
}

/* 右侧详情：Boss */
function DeskBossDetail({
  game,
  boss,
  onBack,
  onStart
}) {
  const GAP = ['', '剧情极少', '剧情少量', '剧情中等', '剧情大量', '全部缺失'];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "desk-detail-back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "back",
    size: 15
  }), "\u8FD4\u56DE"), /*#__PURE__*/React.createElement("div", {
    className: "desk-detail-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "planet"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pin",
    size: 12
  }), boss.planet, " \xB7 ", boss.pct, "%"), /*#__PURE__*/React.createElement("h3", null, boss.name), /*#__PURE__*/React.createElement("div", {
    className: "en"
  }, boss.nameEn), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      marginTop: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--txt-3)'
    }
  }, "\u8DF3\u5173\u8865\u8BFE \xB7 ", GAP[boss.gap]), /*#__PURE__*/React.createElement("div", {
    className: "gap-dots"
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: i < boss.gap ? 'on' : ''
  }))), boss.hi && /*#__PURE__*/React.createElement("span", {
    className: "tag hot",
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 11
  }), " \u9AD8\u5149\u6218"))), /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u5267\u60C5\u80CC\u666F"), /*#__PURE__*/React.createElement("p", null, boss.plot)), /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u767B\u573A\u4EBA\u7269"), /*#__PURE__*/React.createElement("p", null, boss.chars)), /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u6218\u6597\u6280\u5DE7"), /*#__PURE__*/React.createElement("p", null, boss.fight)), /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec",
    style: {
      display: 'flex',
      gap: 10
    }
  }, game.save && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dl",
    size: 15
  }), " \u4E0B\u8F7D\u5B58\u6863"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 1
    },
    onClick: () => onStart(boss.pct)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 14
  }), " \u4ECE\u8FD9\u91CC\u5F00\u59CB")));
}

/* 右侧详情：入场点 */
function DeskEntryDetail({
  game,
  entry,
  onBack,
  onStart
}) {
  const pct = entry.pct;
  const skipped = game.chapters.filter(c => c.end <= pct);
  const entering = game.chapters.find(c => pct >= c.start && pct < c.end) || game.chapters[0];
  const abilities = [];
  game.journey.filter(j => j.pct <= pct).forEach(j => (j.unlocks || []).forEach(u => {
    if (!abilities.includes(u)) abilities.push(u);
  }));
  const seen = [];
  game.chapters.filter(c => c.start < pct).forEach(c => (c.chars || '').split(/[、\n]/).forEach(s => {
    const t = s.trim();
    if (!t) return;
    const m = t.match(/^([^（(：:]+)[（(：:]?\s*([^）)]*)/);
    const name = (m ? m[1] : t).trim();
    const role = (m && m[2] ? m[2] : '').replace(/[）)]+$/, '').trim();
    if (name && name.length <= 12 && !seen.some(o => o.name === name)) seen.push({
      name,
      role
    });
  }));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "desk-detail-back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "back",
    size: 15
  }), "\u8FD4\u56DE"), /*#__PURE__*/React.createElement("div", {
    className: "desk-detail-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "planet"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 12
  }), "\u63A8\u8350\u8D77\u70B9 \xB7 \u4ECE ", pct, "% \u5F00\u59CB"), /*#__PURE__*/React.createElement("h3", null, entry.label), /*#__PURE__*/React.createElement("div", {
    className: "en",
    style: {
      fontStyle: 'normal',
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent)'
    }
  }, remainHours(game, pct), " \u5C0F\u65F6\u901A\u5173 \xB7 \u8FDB\u5165\u300A", entering.name, "\u300B")), /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u5F00\u59CB\u524D\u4F60\u9700\u8981\u77E5\u9053"), skipped.length === 0 ? /*#__PURE__*/React.createElement("p", null, "\u8FD9\u662F\u5B8C\u6574\u4F53\u9A8C\u8D77\u70B9\uFF0C\u65E0\u9700\u8865\u8BFE\u3002") : /*#__PURE__*/React.createElement("div", {
    className: "ed-recap"
  }, skipped.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ed-recap-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rc-pct mono"
  }, c.end, "%"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "rc-name"
  }, c.name), /*#__PURE__*/React.createElement("div", {
    className: "rc-key"
  }, c.key)))))), entering.plot && /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u4F60\u5C06\u4ECE\u8FD9\u91CC\u8FDB\u5165"), /*#__PURE__*/React.createElement("p", null, entering.plot)), abilities.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u6B64\u65F6\u4F60\u5DF2\u62E5\u6709"), /*#__PURE__*/React.createElement("div", {
    className: "ed-tags"
  }, abilities.slice(0, 12).map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "tag accent"
  }, a)))), seen.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u5DF2\u767B\u573A\u7684\u5173\u952E\u4EBA\u7269"), /*#__PURE__*/React.createElement("div", {
    className: "char-grid"
  }, seen.slice(0, 8).map((c, i) => /*#__PURE__*/React.createElement(CharCard, {
    key: i,
    name: c.name,
    role: c.role,
    game: game
  })))), /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u4E3A\u4EC0\u4E48\u4ECE\u8FD9\u91CC\u5F00\u59CB"), /*#__PURE__*/React.createElement("p", null, entry.reason)), /*#__PURE__*/React.createElement("div", {
    className: "desk-dsec",
    style: {
      display: 'flex',
      gap: 10
    }
  }, game.save && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dl",
    size: 15
  }), " \u4E0B\u8F7D\u5B58\u6863"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      flex: 1
    },
    onClick: () => onStart(pct)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 14
  }), " \u4ECE\u8FD9\u91CC\u5F00\u59CB")));
}

/* 右侧：舆情 */
function DeskSentiment({
  game
}) {
  const s = game.sentiment,
    tier = tierOf(s.score);
  const groups = [{
    t: '好评',
    cls: 'praise',
    data: s.praise
  }, {
    t: '热议',
    cls: 'hot',
    data: s.hot
  }, {
    t: '差评',
    cls: 'crit',
    data: s.criticism
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 16px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "score-hero",
    style: {
      padding: '16px 14px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(ScoreRing, {
    score: s.score
  }), /*#__PURE__*/React.createElement("div", {
    className: "score-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lvl",
    style: {
      color: tier.c
    }
  }, tier.t), /*#__PURE__*/React.createElement("div", {
    className: "src mono"
  }, s.source), /*#__PURE__*/React.createElement("div", {
    className: "note"
  }, s.note))), s.quotes.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "quote"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qmark"
  }, "\u201D"), /*#__PURE__*/React.createElement("p", null, q.text), /*#__PURE__*/React.createElement("div", {
    className: "ft"
  }, /*#__PURE__*/React.createElement("span", {
    className: "au"
  }, q.author), /*#__PURE__*/React.createElement("span", {
    className: "up"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "thumb",
    size: 13
  }), q.up >= 1000 ? (q.up / 1000).toFixed(1) + 'k' : q.up)))), groups.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.cls,
    className: "kw-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gh"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'gh-ic ' + g.cls
  }, /*#__PURE__*/React.createElement(Icon, {
    name: g.cls === 'hot' ? 'flame' : 'thumb',
    size: 12,
    style: g.cls === 'crit' ? {
      transform: 'rotate(180deg)'
    } : null
  })), /*#__PURE__*/React.createElement("span", {
    className: "gh-t"
  }, g.t), /*#__PURE__*/React.createElement("span", {
    className: "gh-n mono"
  }, g.data.length)), /*#__PURE__*/React.createElement("div", {
    className: "kw-wrap"
  }, g.data.map((k, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "kw-chip"
  }, k))))));
}

/* 右侧：历程 */
function DeskJourney({
  game,
  value,
  setValue
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "journey",
    style: {
      padding: '8px 16px 24px'
    }
  }, game.journey.map((s, i) => {
    const done = value > s.pct,
      cur = Math.abs(value - s.pct) <= 8;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'jstep' + (done ? ' done' : '') + (cur ? ' cur' : ''),
      onClick: () => setValue(s.pct)
    }, /*#__PURE__*/React.createElement("div", {
      className: "jrail"
    }, /*#__PURE__*/React.createElement("div", {
      className: "jdot"
    }), i < game.journey.length - 1 && /*#__PURE__*/React.createElement("div", {
      className: "jline"
    })), /*#__PURE__*/React.createElement("div", {
      className: "jcontent"
    }, /*#__PURE__*/React.createElement("div", {
      className: "jpct mono"
    }, s.pct, "%"), /*#__PURE__*/React.createElement("div", {
      className: "jevent"
    }, s.event), /*#__PURE__*/React.createElement("div", {
      className: "jdesc"
    }, s.desc), /*#__PURE__*/React.createElement("div", {
      className: "junlocks"
    }, s.unlocks.map((u, k) => /*#__PURE__*/React.createElement("span", {
      key: k,
      className: "tag accent"
    }, u)))));
  }));
}
function DesktopApp({
  games,
  gi,
  enter,
  value,
  setValue,
  theme,
  setTheme,
  onProfile
}) {
  const game = games[gi];
  const [aside, setAside] = useStateD('senti');
  const [detail, setDetail] = useStateD(null);
  useEffectD(() => {
    setDetail(null);
  }, [gi]);
  const th = game.theme;
  const vars = {
    '--g-bg': th.bg,
    '--g-card': th.card,
    '--g-accent': th.accent,
    '--g-accent2': th.accent2,
    '--g-text': th.text
  };
  const cls = 'yb-app yb-desk' + (theme === 'light' ? ' light' : '');
  const curChap = game.chapters.find(c => value >= c.start && value < c.end) || game.chapters[game.chapters.length - 1];
  return /*#__PURE__*/React.createElement("div", {
    className: "desk-window",
    style: vars
  }, /*#__PURE__*/React.createElement("div", {
    className: cls,
    style: vars
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-titlebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-brand"
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 22,
    glyph: true
  }), /*#__PURE__*/React.createElement("b", null, "\u6E38\u4F34 YouBan"), /*#__PURE__*/React.createElement("span", {
    className: "div"
  }), /*#__PURE__*/React.createElement("span", {
    className: "gname"
  }, game.titleMain)), /*#__PURE__*/React.createElement("div", {
    className: "desk-tb-spacer"
  }), /*#__PURE__*/React.createElement(ThemeToggle, {
    theme: theme,
    setTheme: setTheme,
    game: game
  }), /*#__PURE__*/React.createElement("div", {
    className: "desk-winbtns"
  }, /*#__PURE__*/React.createElement(WinBtn, {
    kind: "min"
  }), /*#__PURE__*/React.createElement(WinBtn, {
    kind: "max"
  }), /*#__PURE__*/React.createElement(WinBtn, {
    kind: "close"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "desk-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-side-h"
  }, "\u6E38\u620F\u5E93 \xB7 ", games.length), /*#__PURE__*/React.createElement("div", {
    className: "desk-scroll"
  }, games.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: g.id,
    className: 'desk-game' + (i === gi ? ' on' : ''),
    onClick: () => enter(i, true)
  }, /*#__PURE__*/React.createElement("img", {
    src: g.poster,
    alt: "",
    onError: e => e.target.style.opacity = .25
  }), /*#__PURE__*/React.createElement("div", {
    className: "gi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, g.short), /*#__PURE__*/React.createElement("div", {
    className: "pb"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: Math.max(3, g.currentPct) + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "pc"
  }, g.currentPct, "% \xB7 ", g.hoursMain, "h"))))), /*#__PURE__*/React.createElement("div", {
    className: "desk-profile",
    onClick: onProfile
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/avatar-default.svg",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "pm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, "\u5929\u547D\u73A9\u5BB6"), /*#__PURE__*/React.createElement("div", {
    className: "s"
  }, games.length, " \u6B3E \xB7 \u5DF2\u540C\u6B65")), /*#__PURE__*/React.createElement(Icon, {
    name: "set",
    size: 16,
    style: {
      color: 'var(--txt-3)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "desk-col mid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-hero"
  }, /*#__PURE__*/React.createElement("img", {
    className: "bg",
    src: game.banner,
    alt: "",
    onError: e => e.target.style.display = 'none'
  }), /*#__PURE__*/React.createElement("div", {
    className: "sc"
  }), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gname"
  }, game.titleMain), /*#__PURE__*/React.createElement("div", {
    className: "gsub"
  }, game.titleSub, " \xB7 ", game.developer, " \xB7 ", game.year)), /*#__PURE__*/React.createElement("div", {
    className: "pct"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mono"
  }, value, /*#__PURE__*/React.createElement("i", null, "%")), /*#__PURE__*/React.createElement("span", null, "\u5DF2\u5B8C\u6210"))), /*#__PURE__*/React.createElement("div", {
    className: "desk-main-body"
  }, /*#__PURE__*/React.createElement(ProgressInput, {
    game: game,
    value: value,
    setValue: setValue
  }), /*#__PURE__*/React.createElement("div", {
    className: "desk-stat-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "\u5DF2\u73A9\u7EA6"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, (game.hoursMain * value / 100).toFixed(1), /*#__PURE__*/React.createElement("small", null, "h"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "\u5269\u4F59\u7EA6"), /*#__PURE__*/React.createElement("div", {
    className: "v accent"
  }, ((100 - value) / 100 * game.hoursMain).toFixed(1), /*#__PURE__*/React.createElement("small", null, "h"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "\u4E3B\u7EBF\u5171"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "~", game.hoursMain, /*#__PURE__*/React.createElement("small", null, "h")))), /*#__PURE__*/React.createElement("div", {
    className: "desk-prog-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "\u6D41\u7A0B\u8FDB\u5EA6 \xB7 \u62D6\u52A8\u9884\u89C8"), /*#__PURE__*/React.createElement("div", {
    className: "now mono"
  }, curChap.name.split('·').pop().trim())), /*#__PURE__*/React.createElement(HypeProgress, {
    game: game,
    value: value,
    onChange: setValue,
    onBoss: b => {
      setDetail({
        kind: 'boss',
        data: b
      });
    },
    onEntry: e => {
      setDetail({
        kind: 'entry',
        data: e
      });
    },
    idBase: 'desk-' + game.id
  }), /*#__PURE__*/React.createElement("div", {
    className: "sec-h",
    style: {
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\u5168\u6D41\u7A0B\u7AE0\u8282"), /*#__PURE__*/React.createElement("div", {
    className: "ln"
  }), /*#__PURE__*/React.createElement("div", {
    className: "n mono"
  }, game.chapters.length, " \u7AE0")), game.chapters.map((c, i) => {
    const done = value >= c.end,
      cur = value >= c.start && value < c.end;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'chap' + (done ? ' done' : '') + (cur ? ' cur' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "chap-row",
      onClick: () => setValue(Math.round((c.start + c.end) / 2))
    }, /*#__PURE__*/React.createElement("div", {
      className: "dot"
    }), /*#__PURE__*/React.createElement("div", {
      className: "info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "nm"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "mt"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pin",
      size: 11
    }), c.planet)), /*#__PURE__*/React.createElement("div", {
      className: "rng mono"
    }, c.start, "\u2013", c.end, "%")));
  })))), /*#__PURE__*/React.createElement("div", {
    className: "desk-col"
  }, detail ? /*#__PURE__*/React.createElement("div", {
    className: "desk-scroll"
  }, detail.kind === 'boss' ? /*#__PURE__*/React.createElement(DeskBossDetail, {
    game: game,
    boss: detail.data,
    onBack: () => setDetail(null),
    onStart: p => {
      setValue(p);
      setDetail(null);
    }
  }) : /*#__PURE__*/React.createElement(DeskEntryDetail, {
    game: game,
    entry: detail.data,
    onBack: () => setDetail(null),
    onStart: p => {
      setValue(p);
      setDetail(null);
    }
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "desk-aside-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'desk-atab' + (aside === 'senti' ? ' on' : ''),
    onClick: () => setAside('senti')
  }, "\u73A9\u5BB6\u8206\u60C5"), /*#__PURE__*/React.createElement("button", {
    className: 'desk-atab' + (aside === 'journey' ? ' on' : ''),
    onClick: () => setAside('journey')
  }, "\u6210\u957F\u5386\u7A0B")), /*#__PURE__*/React.createElement("div", {
    className: "desk-scroll"
  }, aside === 'senti' ? /*#__PURE__*/React.createElement(DeskSentiment, {
    game: game
  }) : /*#__PURE__*/React.createElement(DeskJourney, {
    game: game,
    value: value,
    setValue: setValue
  })))))));
}
Object.assign(window, {
  DesktopApp,
  ScaledFrame
});