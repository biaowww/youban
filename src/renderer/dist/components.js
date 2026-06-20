function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ============================================================
   游伴 YouBan · 共享组件
   ============================================================ */
const {
  useState,
  useRef,
  useEffect,
  useCallback
} = React;

/* ───────── 图标（Lucide 风格 2px 描边） ───────── */
const P = (d, props = {}) => /*#__PURE__*/React.createElement("path", _extends({
  d: d,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, props));
function Icon({
  name,
  size,
  style
}) {
  const s = size || 24;
  const wrap = kids => /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    style: style
  }, kids);
  switch (name) {
    case 'progress':
      return wrap(P('M3 12h4l2.5-6 4 12L17 9l1.5 3H21'));
    case 'journey':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M6 4v12'), /*#__PURE__*/React.createElement("circle", {
        cx: "6",
        cy: "18",
        r: "2.4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      }), P('M6 4a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v2'), /*#__PURE__*/React.createElement("circle", {
        cx: "18",
        cy: "16",
        r: "2.4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      })));
    case 'chat':
      return wrap(P('M21 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 21 11.5z'));
    case 'back':
      return wrap(P('M15 5l-7 7 7 7'));
    case 'grid':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z')));
    case 'sword':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M14.5 17.5 3 6V3h3l11.5 11.5'), P('M13 19l6-6'), P('M16 16l4 4'), P('M19 21l2-2')));
    case 'flame':
      return wrap(P('M12 3c0 3-4 4-4 8a4 4 0 0 0 8 0c0-1.5-.8-2.5-1.5-3.5C13.3 7.8 14 6 12 3z'));
    case 'flag':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M6 21V4'), P('M6 4.5h11l-2.4 3.5L17 11.5H6')));
    case 'thumb':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M7 21V10l4.2-6.4a1.7 1.7 0 0 1 3 1V8h4.4a1.8 1.8 0 0 1 1.8 2.1l-1.1 6A2.2 2.2 0 0 1 21.1 18H7'), /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "10",
        width: "4",
        height: "11",
        rx: "1",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      })));
    case 'target':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "8",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "3.3",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      }), P('M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3')));
    case 'users':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "8",
        r: "3.4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      }), P('M3.5 20a5.5 5.5 0 0 1 11 0'), P('M16 5.2a3.4 3.4 0 0 1 0 6.4'), P('M17.5 14.4A5.5 5.5 0 0 1 21 19.5')));
    case 'gem':
      return wrap(/*#__PURE__*/React.createElement("path", {
        d: "M12 4l3.6 3.6L12 20 8.4 7.6z",
        fill: "currentColor"
      }));
    case 'lock':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
        x: "4.5",
        y: "10.5",
        width: "15",
        height: "10",
        rx: "2.2",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      }), P('M8 10.5V7.5a4 4 0 0 1 8 0v3'), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "15.5",
        r: "1.4",
        fill: "currentColor"
      })));
    case 'mask':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M4 5c0 9 3 14 8 14s8-5 8-14c-2.6 1-5.2 1.4-8 1.4S6.6 6 4 5z'), P('M8.5 11c.8.7 1.7.7 2.5 0M13 11c.8.7 1.7.7 2.5 0')));
    case 'pin':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z'), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "10",
        r: "2.6",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      })));
    case 'up':
      return wrap(P('M7 11l5-6 5 6M12 5v14'));
    case 'play':
      return wrap(/*#__PURE__*/React.createElement("path", {
        d: "M7 4.5v15l12-7.5z",
        fill: "currentColor"
      }));
    case 'chev':
      return wrap(P('M9 6l6 6-6 6'));
    case 'chevd':
      return wrap(P('M6 9l6 6 6-6'));
    case 'x':
      return wrap(P('M6 6l12 12M18 6L6 18'));
    case 'dl':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M12 3v12'), P('M7 11l5 4 5-4'), P('M4 21h16')));
    case 'search':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z'), P('M20 20l-3.5-3.5')));
    case 'trophy':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M7 4h10v5a5 5 0 0 1-10 0z'), P('M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3'), P('M9 20h6M12 14v6')));
    case 'camera':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M4 8h3l1.5-2h7L17 8h3v11H4z'), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "13",
        r: "3.4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      })));
    case 'check':
      return wrap(P('M5 12l4.5 4.5L19 7'));
    case 'star':
      return wrap(/*#__PURE__*/React.createElement("path", {
        d: "M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.8 6.6 19.4l1.2-6L3.3 9.3l6.1-.7L12 3z",
        fill: "currentColor"
      }));
    case 'sun':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4'), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8"
      })));
    case 'swatch':
      return wrap(/*#__PURE__*/React.createElement(React.Fragment, null, P('M12 3a9 9 0 0 0 0 18 3 3 0 0 0 3-3 2 2 0 0 1 2-2h1a3 3 0 0 0 3-3 9 9 0 0 0-9-9z'), /*#__PURE__*/React.createElement("circle", {
        cx: "7.5",
        cy: "11",
        r: "1.2",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "7.5",
        r: "1.2",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "16.5",
        cy: "11",
        r: "1.2",
        fill: "currentColor"
      })));
    default:
      return wrap(null);
  }
}

/* ───────── 品牌 Logo ───────── */
function Logo({
  size = 40,
  glyph = false
}) {
  return /*#__PURE__*/React.createElement("img", {
    src: glyph ? 'assets/youban-glyph.svg' : 'assets/youban-mark.svg',
    width: size,
    height: size,
    alt: "\u6E38\u4F34 YouBan",
    style: {
      display: 'block',
      borderRadius: glyph ? 0 : size * 0.24
    }
  });
}

/* ───────── 平台真实 Logo（Simple Icons CDN，带降级） ───────── */
const PLATFORM_ICON = {
  steam: 'https://cdn.simpleicons.org/steam/9bc1d6',
  playstation: 'https://cdn.simpleicons.org/playstation/4f8fde',
  epicgames: 'https://cdn.simpleicons.org/epicgames/e8e0d0',
  wegame: 'assets/wegame-mark.svg'
};
function PlatformLogo({
  id,
  color,
  size = 22
}) {
  const src = PLATFORM_ICON[id];
  if (!src) return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: size * 0.5,
      color
    }
  }, "?");
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    width: size,
    height: size,
    alt: id,
    onError: e => {
      e.target.style.display = 'none';
    },
    style: {
      display: 'block'
    }
  });
}

/* ───────── 状态栏 ───────── */
function StatusBar() {
  return /*#__PURE__*/React.createElement("div", {
    className: "yb-status"
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("div", {
    className: "ico"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "11",
    viewBox: "0 0 18 11"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7",
    width: "3",
    height: "4",
    rx: ".6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "4.5",
    width: "3",
    height: "6.5",
    rx: ".6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "2",
    width: "3",
    height: "9",
    rx: ".6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15",
    y: "0",
    width: "3",
    height: "11",
    rx: ".6"
  }))), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "11",
    viewBox: "0 0 16 11",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2.5c2.1 0 4 .8 5.4 2.1l1-1A9 9 0 0 0 8 .8 9 9 0 0 0 1.6 3.6l1 1A7.6 7.6 0 0 1 8 2.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 5.8c1.2 0 2.3.5 3.1 1.3l1-1A6 6 0 0 0 8 4.3 6 6 0 0 0 3.9 6.1l1 1A4.4 4.4 0 0 1 8 5.8z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "9.2",
    r: "1.4"
  })), /*#__PURE__*/React.createElement("svg", {
    width: "25",
    height: "12",
    viewBox: "0 0 25 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: ".5",
    y: ".5",
    width: "21",
    height: "11",
    rx: "3",
    fill: "none",
    stroke: "currentColor",
    strokeOpacity: ".4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "16",
    height: "8",
    rx: "1.6",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "23",
    y: "4",
    width: "1.5",
    height: "4",
    rx: ".75",
    fill: "currentColor",
    fillOpacity: ".5"
  }))));
}

/* ───────── 底部 Tab（游戏内：进度 / 历程 / 舆情） ───────── */
const TABS = [{
  id: 'progress',
  name: '进度',
  icon: 'progress'
}, {
  id: 'journey',
  name: '历程',
  icon: 'journey'
}, {
  id: 'senti',
  name: '舆情',
  icon: 'chat'
}];
function TabBar({
  tab,
  setTab
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "yb-tabbar"
  }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    className: 'yb-tab' + (tab === t.id ? ' on' : ''),
    onClick: () => setTab(t.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon
  }), /*#__PURE__*/React.createElement("span", null, t.name))));
}

/* ───────── 主题开关（浅色 ⇄ 游戏主题色） ───────── */
function ThemeToggle({
  theme,
  setTheme,
  game
}) {
  const on = theme === 'game';
  return /*#__PURE__*/React.createElement("button", {
    className: 'theme-toggle' + (on ? ' on' : ''),
    onClick: () => setTheme(on ? 'light' : 'game'),
    title: on ? '当前：游戏主题色' : '当前：浅色'
  }, /*#__PURE__*/React.createElement("span", {
    className: "tt-knob"
  }, on ? /*#__PURE__*/React.createElement(Icon, {
    name: "swatch",
    size: 13
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: "sun",
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "tt-lbl"
  }, on ? '主题色' : '浅色'));
}

/* ───────── 工具 ───────── */
const remainHours = (g, pct) => Math.max(1, Math.round(g.hoursMain * (100 - pct) / 100));
const tierOf = s => s >= 85 ? {
  t: '好评如潮',
  c: '#6fb53e'
} : s >= 70 ? {
  t: '多半好评',
  c: 'var(--gold)'
} : s >= 40 ? {
  t: '褒贬不一',
  c: '#d68b3a'
} : {
  t: '多半差评',
  c: '#C25A4A'
};
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1],
      cx = (a.x + b.x) / 2;
    d += ` C ${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}`;
  }
  return d;
}
const peakY = score => 40 - score / 10 * 30 - 4; // viewBox 0..40

/* 节点类型：boss 战 / 剧情高潮 / 关键人物引入 */
const NODE_TYPES = {
  boss: {
    label: 'Boss 战',
    icon: 'sword',
    cls: 'boss'
  },
  climax: {
    label: '剧情高潮',
    icon: 'flame',
    cls: 'climax'
  },
  char: {
    label: '关键人物',
    icon: 'mask',
    cls: 'char'
  }
};
function buildNodes(game) {
  const out = [];
  game.bosses.forEach(b => out.push({
    pct: b.pct,
    type: 'boss',
    label: b.name,
    boss: b,
    w: b.hi ? 3 : 2
  }));
  game.hype.forEach(p => {
    if (!game.bosses.some(b => Math.abs(b.pct - p.pct) <= 3)) out.push({
      pct: p.pct,
      type: 'climax',
      label: p.label,
      w: p.score >= 9 ? 2.6 : 1.4
    });
  });
  game.chapters.forEach((c, i) => {
    if (i === 0 || !c.chars) return;
    if (out.some(n => Math.abs(n.pct - c.start) <= 5)) return;
    const nm = ((c.chars.split(/[、\n]/)[0] || '').split(/[（(：:]/)[0] || '').trim();
    out.push({
      pct: c.start,
      type: 'char',
      label: nm ? nm + ' 登场' : '关键人物登场',
      chars: c.chars,
      w: 1
    });
  });
  out.sort((a, b) => a.pct - b.pct);
  return out;
}
// 默认展示的高亮节点（按重要度，去密集）
function pickHighlights(nodes, n = 6) {
  const ranked = [...nodes].sort((a, b) => b.w - a.w);
  const chosen = [];
  for (const nd of ranked) {
    if (chosen.length >= n) break;
    if (chosen.some(c => Math.abs(c.pct - nd.pct) < 7)) continue;
    chosen.push(nd);
  }
  return chosen.sort((a, b) => a.pct - b.pct);
}

/* ───────── Hype 进度控件（核心交互） ───────── */
function HypeProgress({
  game,
  value,
  onChange,
  onBoss,
  onEntry,
  idBase
}) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const [tapped, setTapped] = useState(null);
  const gid = idBase || game.id;
  const pk = game.hype;
  const nodes = React.useMemo(() => buildNodes(game), [game.id]);
  const highlights = React.useMemo(() => pickHighlights(nodes, 6), [game.id]);
  const entries = (game.entries || []).filter(e => e.pct > 0);

  // 波形：在相邻高潮之间插入低谷控制点，制造明显的高低起伏
  const Y = s => 100 - Math.max(0, Math.min(10, s)) / 10 * 86 - 7;
  const cps = [{
    x: 0,
    s: 1.1
  }];
  pk.forEach((p, i) => {
    if (i > 0) {
      const pr = pk[i - 1];
      const valley = Math.max(0.8, Math.min(pr.score, p.score) - 3.6 - i % 2 * 0.8);
      cps.push({
        x: (pr.pct + p.pct) / 2,
        s: valley
      });
    }
    cps.push({
      x: p.pct,
      s: p.score
    });
  });
  cps.push({
    x: 100,
    s: 1.1
  });
  const wpts = cps.map(c => ({
    x: c.x,
    y: Y(c.s)
  }));
  const line = smoothPath(wpts);
  const area = line + ' L 100 100 L 0 100 Z';
  const setFromX = useCallback(clientX => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let pct = (clientX - r.left) / r.width * 100;
    pct = Math.max(0, Math.min(100, pct));
    for (const p of pk) if (Math.abs(p.pct - pct) < 1.6) pct = p.pct;
    onChange(Math.round(pct));
  }, [pk, onChange]);
  useEffect(() => {
    if (!drag) return;
    const mv = e => {
      e.preventDefault();
      setFromX(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const up = () => setDrag(false);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, setFromX]);

  // 可见节点：静止时只显示高亮节点；拖动时显示当前位置前后各 3 个
  let visible;
  if (drag) {
    const before = nodes.filter(n => n.pct < value).slice(-3);
    const after = nodes.filter(n => n.pct >= value).slice(0, 3);
    visible = [...before, ...after];
  } else visible = highlights;
  const visKeys = new Set(visible.map(n => n.pct + n.type));
  const tapNode = (n, e) => {
    e.stopPropagation();
    if (n.type === 'boss') {
      onBoss && onBoss(n.boss);
    } else {
      setTapped(t => t && t.pct === n.pct ? null : n);
    }
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "hype",
    ref: ref,
    onPointerDown: e => {
      setTapped(null);
      setDrag(true);
      setFromX(e.clientX);
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "wave",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: 'wg-' + gid,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--g-accent)",
    stopOpacity: ".5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "58%",
    stopColor: "var(--g-accent)",
    stopOpacity: ".14"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--g-accent)",
    stopOpacity: ".02"
  })), /*#__PURE__*/React.createElement("clipPath", {
    id: 'wc-' + gid
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: value,
    height: "100"
  }))), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: 'url(#wg-' + gid + ')',
    opacity: ".34"
  }), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: 'url(#wg-' + gid + ')',
    clipPath: 'url(#wc-' + gid + ')'
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--g-accent)",
    strokeWidth: ".8",
    strokeOpacity: ".3",
    vectorEffect: "non-scaling-stroke"
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--g-accent)",
    strokeWidth: "1.6",
    clipPath: 'url(#wc-' + gid + ')',
    vectorEffect: "non-scaling-stroke"
  })), /*#__PURE__*/React.createElement("div", {
    className: "baseline"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fill",
    style: {
      width: value + '%'
    }
  }), game.chapters.slice(0, -1).map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "tick",
    style: {
      left: c.end + '%'
    }
  })), entries.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: 'e' + i,
    className: "enode",
    style: {
      left: e.pct + '%'
    },
    onPointerDown: ev => ev.stopPropagation(),
    onClick: ev => {
      ev.stopPropagation();
      onEntry && onEntry(e);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 12
  }))), nodes.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'node n-' + NODE_TYPES[n.type].cls + (n.pct < value ? ' passed' : ' upcoming') + (visKeys.has(n.pct + n.type) ? '' : ' hidden') + (tapped && tapped.pct === n.pct ? ' on' : ''),
    style: {
      left: n.pct + '%'
    },
    onPointerDown: e => e.stopPropagation(),
    onClick: e => tapNode(n, e)
  })), tapped && /*#__PURE__*/React.createElement("div", {
    className: 'node-cap n-' + NODE_TYPES[tapped.type].cls,
    style: {
      left: Math.min(80, Math.max(16, tapped.pct)) + '%'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "nc-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: NODE_TYPES[tapped.type].icon,
    size: 11
  })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, NODE_TYPES[tapped.type].label), tapped.label)), /*#__PURE__*/React.createElement("div", {
    className: "thumb",
    style: {
      left: value + '%'
    },
    onPointerDown: e => {
      e.stopPropagation();
      setTapped(null);
      setDrag(true);
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "thumb-flag",
    style: {
      left: value + '%'
    }
  }, value, "%")), /*#__PURE__*/React.createElement("div", {
    className: "hype-ends"
  }, /*#__PURE__*/React.createElement("span", null, "\u5F00\u573A"), /*#__PURE__*/React.createElement("span", null, drag ? '显示当前位置前后节点' : '高光节点 · 拖动查看更多'), /*#__PURE__*/React.createElement("span", null, "\u7EC8\u7AE0")), /*#__PURE__*/React.createElement("div", {
    className: "node-legend"
  }, Object.values(NODE_TYPES).map(t => /*#__PURE__*/React.createElement("span", {
    key: t.cls,
    className: 'leg n-' + t.cls
  }, /*#__PURE__*/React.createElement("i", {
    className: "leg-dot"
  }), t.label)), /*#__PURE__*/React.createElement("span", {
    className: "leg n-entry"
  }, /*#__PURE__*/React.createElement("i", {
    className: "leg-dot leg-star"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 9
  })), "\u63A8\u8350\u8D77\u70B9")));
}

/* ───────── 评分环 ───────── */
function ScoreRing({
  score
}) {
  const r = 40,
    c = 2 * Math.PI * r,
    tier = tierOf(score);
  return /*#__PURE__*/React.createElement("div", {
    className: "score-ring"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 92 92"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "46",
    cy: "46",
    r: r,
    fill: "none",
    stroke: "rgba(127,127,127,.2)",
    strokeWidth: "7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "46",
    cy: "46",
    r: r,
    fill: "none",
    stroke: tier.c,
    strokeWidth: "7",
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * (1 - score / 100),
    style: {
      transition: 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: tier.c
    }
  }, score), /*#__PURE__*/React.createElement("span", null, "\u597D\u8BC4\u7387 %")));
}
Object.assign(window, {
  Icon,
  Logo,
  PlatformLogo,
  StatusBar,
  TabBar,
  TABS,
  ThemeToggle,
  HypeProgress,
  ScoreRing,
  remainHours,
  tierOf
});